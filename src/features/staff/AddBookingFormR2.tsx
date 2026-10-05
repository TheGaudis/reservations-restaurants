import { defineMessages } from "react-intl";

import { orderOutcome, orderR2Input } from "@/domain/bookings";
import type { IdentityValues } from "@/domain/bookings";
import { dishesForDay, remainingStock } from "@/domain/capacity";
import type { Dish, FullState, ServiceMode, WriteResponse } from "@/domain/types";
import { dayHasVoucher } from "@/domain/vouchers";
import { identityErrors } from "@/features/booking/identity-rules";
import { IdentityFields, ObservationField } from "@/features/booking/IdentityFields";
import { SlowWriteNotice } from "@/features/booking/SlowWriteNotice";
import { useRequestId } from "@/features/booking/use-request-id";
import { useSlowWrite } from "@/features/booking/use-slow-write";
import { usePageSearch } from "@/features/calendar/page-search";
import {
  addedToast,
  addFormId,
  addFormTarget,
  ajoutValue,
  useCloseAddBooking,
} from "@/features/staff/add-booking";
import { AddPersonButton } from "@/features/staff/AddBookingParts";
import { modeOptions, portionsError } from "@/features/staff/booking-r2";
import { FormActions } from "@/features/staff/FormActions";
import { useStaffState } from "@/features/staff/use-staff-state";
import { commonMessages } from "@/intl/common-messages";
import { intl } from "@/intl/intl";
import { staffCommonMessages } from "@/intl/staff-messages";
import { useOrderR2 } from "@/mutations/bookings";
import { showStaffError } from "@/mutations/staff/write";
import { showToast } from "@/ui/feedback/toast";
import { useAppForm } from "@/ui/form/app-form";
import { Form } from "@/ui/form/Form";
import { focusFirstInput, focusOnMount } from "@/ui/pending-focus";

import styles from "@/features/staff/AddBookingForm.module.css";

// « + Ajouter une personne » of each dish of the R2 staff card (06 § 8.1, § 8.3-8.5; C-23), open while
// `ajout=r2:{dish id}`. No cutoff at 10:00: a colleague records an order taken on the spot (06 § 8.4).

const messages = defineMessages<{
  portions: { max: number };
  noneConfirmed: Record<string, never>;
}>({
  portions: {
    id: "staff.addBooking.r2.portions.label",
    defaultMessage: "Portions ({max} au maximum)",
    description:
      "06 § 8.3 — libellé des portions de l'ajout d'une personne R2 (stock restant du plat)",
  },
  noneConfirmed: {
    id: "staff.addBooking.r2.noneConfirmed",
    defaultMessage: "Plus assez de portions disponibles pour ce plat.",
    description:
      "06 § 8.3, 02 § 4.5 — erreur quand le script n'accorde aucune portion (confirmed vide)",
  },
});

interface AddR2Values extends IdentityValues {
  portions: number | null;
  serviceMode: ServiceMode;
}

const IDENTITY = { name: "name", contact: "contact", className: "className" } as const;
const OBSERVATION = { observation: "observation" } as const;

interface AddBookingR2Props {
  dish: Dish;
}

/** « + Ajouter une personne », first of the dish actions, only while portions are left, past days included (06 § 8). */
export function AddBookingButtonR2({ dish }: AddBookingR2Props) {
  const remaining = useStaffState((state: FullState) => remainingStock(state, dish));
  if (remaining <= 0) return null;
  return <AddPersonButton ajout={ajoutValue(dish.id)} />;
}

/** Rules of 06 § 8.1 and § 8.3 in one validator. */
function addR2Rules(value: AddR2Values, max: number) {
  const portions = portionsError(value.portions, max);
  const fields = {
    ...identityErrors(value, "staffAdd"),
    ...(portions === undefined ? {} : { portions }),
  };
  return Object.keys(fields).length === 0 ? undefined : { fields };
}

/**
 * The answer, if the form is still there (06 § 8.3, § 8.5): nothing granted is an error, form kept with its
 * `requestId` (the script records it only when it granted something, 02 § 4.5); else the toast, form closed.
 */
function answered(response: WriteResponse, dish: Dish, asked: number, close: () => void) {
  if (orderOutcome(response) === "nothingConfirmed") {
    showToast(intl.formatMessage(messages.noneConfirmed), "error");
    return;
  }
  const confirmed = response.bookingResult?.confirmed.find((line) => line.dishId === dish.id);
  const toast = addedToast(response, { asked, got: confirmed?.portions ?? asked });
  showToast(toast.text, toast.kind);
  close();
}

/**
 * State and sending. `requestId` is created when the form opens and kept for every new attempt (invariant 3); no
 * password (02 § 4.5). On a voucher day the mode is dine-in, whatever was chosen (invariant 5, D-19).
 */
function useAddFormR2(dish: Dish) {
  const requestId = useRequestId();
  const order = useOrderR2();
  const slowWrite = useSlowWrite();
  const close = useCloseAddBooking(ajoutValue(dish.id));
  const max = useStaffState((state: FullState) => remainingStock(state, dish));
  const dishesOfDay = useStaffState((state: FullState) => dishesForDay(state, dish.date));
  const voucherDay = dayHasVoucher(dishesOfDay);
  const defaultValues: AddR2Values = {
    name: "",
    contact: "",
    className: "",
    observation: "",
    portions: 1,
    serviceMode: voucherDay ? "dineIn" : "takeaway",
  };
  const form = useAppForm({
    defaultValues,
    validators: {
      onDynamic: ({ value }: { value: AddR2Values }) => addR2Rules(value, max),
    },
    onSubmit: async ({ value }) => {
      const asked = value.portions ?? 0;
      const input = orderR2Input(
        { date: dish.date, requestId },
        { ...value, portions: { [dish.id]: asked } },
        dishesOfDay,
      );
      slowWrite.start();
      try {
        await order.mutateAsync(input, {
          onSuccess: (response) => {
            answered(response, dish, asked, close);
          },
        });
      } catch (error) {
        showStaffError(error);
      } finally {
        slowWrite.stop();
      }
    },
  });
  return { form, max, voucherDay, slowWrite, close };
}

function AddBookingFormR2Open({ dish }: AddBookingR2Props) {
  const ajout = ajoutValue(dish.id);
  const { form, max, voucherDay, slowWrite, close } = useAddFormR2(dish);
  return (
    <div
      id={addFormId(ajout)}
      ref={focusOnMount(addFormTarget(ajout), focusFirstInput)}
      className={styles["reveal"]}
    >
      <Form form={form} className={styles["form"]}>
        <IdentityFields form={form} fields={IDENTITY} variant="staffAdd" />
        <div className={styles["row"]}>
          <form.AppField name="portions">
            {(field) => (
              <field.NumberField
                label={intl.formatMessage(messages.portions, { max })}
                min={1}
                decrementLabel={intl.formatMessage(commonMessages.quantityDecrement, {
                  name: dish.name,
                })}
                incrementLabel={intl.formatMessage(commonMessages.quantityIncrement, {
                  name: dish.name,
                })}
              />
            )}
          </form.AppField>
          <form.AppField name="serviceMode">
            {(field) => (
              <field.SegmentedRadio
                legend={intl.formatMessage(commonMessages.serviceMode)}
                options={modeOptions(voucherDay)}
              />
            )}
          </form.AppField>
        </div>
        <ObservationField form={form} fields={OBSERVATION} />
        <FormActions
          onCancel={close}
          submitLabel={intl.formatMessage(staffCommonMessages.addPersonSubmit)}
          pendingLabel={intl.formatMessage(staffCommonMessages.adding)}
        />
        <SlowWriteNotice slow={slowWrite.slow} />
      </Form>
    </div>
  );
}

/**
 * Form « Ajouter une personne » of a dish, under its actions (06 § 8.3, C-23): name and class, optional e-mail,
 * portions (1 by default, at most the stock left) and service mode (« À emporter » by default, « Sur place » alone on a
 * voucher day), observation. Sent by `addBookingR2Multi` with this dish only, without password, after 10:00 too.
 * Success: toast of 06 § 8.5 (partial when the script granted fewer portions), form closed, focus back on « + Ajouter
 * une personne » (E-48), the full state read again. Failure: toast, input and `requestId` kept.
 */
export function AddBookingFormR2({ dish }: AddBookingR2Props) {
  const search = usePageSearch();
  if (search.ajout !== ajoutValue(dish.id)) return null;
  return <AddBookingFormR2Open key={dish.id} dish={dish} />;
}
