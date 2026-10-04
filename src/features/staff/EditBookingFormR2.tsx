import { defineMessages } from "react-intl";

import { editBookingR2Input, maxPortionsForEdit } from "@/domain/bookings";
import type { IdentityValues } from "@/domain/bookings";
import { dishesForDay } from "@/domain/capacity";
import type { BookingR2, Dish, FullState, ServiceMode } from "@/domain/types";
import { dayHasVoucher } from "@/domain/vouchers";
import { SlowWriteNotice } from "@/features/booking/SlowWriteNotice";
import { useSlowWrite } from "@/features/booking/use-slow-write";
import { editResaValue } from "@/features/staff/booking-line";
import { modeOptions, portionsError } from "@/features/staff/booking-r2";
import { editIdentityErrors, identityOf, useCloseEditBooking } from "@/features/staff/edit-booking";
import {
  EditContactField,
  EditNameFields,
  EditObservationField,
} from "@/features/staff/EditBookingFields";
import { FormActions } from "@/features/staff/FormActions";
import { useStaffState } from "@/features/staff/use-staff-state";
import { commonMessages } from "@/intl/common-messages";
import { intl } from "@/intl/intl";
import { isCapacityRefusal, useEditBookingR2 } from "@/mutations/staff/bookings";
import { showStaffError } from "@/mutations/staff/write";
import { useAppForm } from "@/ui/form/app-form";
import { setServerErrors } from "@/ui/form/errors";
import { Form } from "@/ui/form/Form";

import styles from "@/features/staff/EditBookingForm.module.css";

const messages = defineMessages({
  portions: {
    id: "staff.editBooking.r2.portions.label",
    defaultMessage: "Portions",
    description: "06 § 7.4 — libellé des portions d'une réservation R2 modifiée",
  },
});

interface EditR2Values extends IdentityValues {
  portions: number | null;
  serviceMode: ServiceMode;
}

const NAME = { name: "name", className: "className" } as const;
const CONTACT = { contact: "contact" } as const;
const OBSERVATION = { observation: "observation" } as const;

/** Rules of 06 § 7.2 and § 7.4 in one validator. */
function editR2Rules(value: EditR2Values, max: number) {
  const portions = portionsError(value.portions, max);
  const fields = {
    ...editIdentityErrors(value),
    ...(portions === undefined ? {} : { portions }),
  };
  return Object.keys(fields).length === 0 ? undefined : { fields };
}

function useEditFormR2(booking: BookingR2, close: () => void) {
  const edit = useEditBookingR2();
  const slowWrite = useSlowWrite();
  const max = useStaffState((state: FullState) => maxPortionsForEdit(state, booking));
  const voucherDay = useStaffState((state: FullState) =>
    dayHasVoucher(dishesForDay(state, booking.date)),
  );
  // A voucher day is dine-in only, whatever the booking said (invariant 5, D-19).
  const mode: ServiceMode = voucherDay ? "dineIn" : booking.serviceMode;
  const defaultValues: EditR2Values = {
    ...identityOf(booking),
    portions: booking.portions,
    serviceMode: mode,
  };
  const form = useAppForm({
    defaultValues,
    validators: {
      onDynamic: ({ value }: { value: EditR2Values }) => editR2Rules(value, max),
    },
    onSubmit: async ({ value, formApi }) => {
      const sent = { ...value, serviceMode: voucherDay ? "dineIn" : value.serviceMode } as const;
      slowWrite.start();
      try {
        await edit.mutateAsync(editBookingR2Input(booking.id, sent), {
          onSuccess: close,
        });
      } catch (error) {
        if (isCapacityRefusal(error)) {
          setServerErrors(formApi, { portions: error.message });
        } else {
          showStaffError(error);
        }
      } finally {
        slowWrite.stop();
      }
    },
  });
  return { form, voucherDay, slowWrite };
}

interface EditBookingFormR2Props {
  booking: BookingR2;
  /** Dish of the booking line: names the −/+ buttons of the portions (D-17). */
  dish: Dish;
}

/**
 * « Modifier » of an R2 booking line, under its row (06 § 7.4, C-24): identity, portions bounded by the stock left
 * plus the line's own portions (D-19), service mode (« Sur place » alone on a voucher day, D-19), observation. The dish
 * itself does not change. Success: toast « Réservation modifiée. », form closed; failure: the script's message under
 * the portions (stock) or in a toast.
 */
export function EditBookingFormR2({ booking, dish }: EditBookingFormR2Props) {
  const close = useCloseEditBooking(editResaValue("r2", booking.id));
  const { form, voucherDay, slowWrite } = useEditFormR2(booking, close);
  return (
    <Form form={form} className={styles["form"]}>
      <EditNameFields form={form} fields={NAME} />
      <div className={styles["row"]}>
        <EditContactField form={form} fields={CONTACT} />
        <form.AppField name="portions">
          {(field) => (
            <field.NumberField
              label={intl.formatMessage(messages.portions)}
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
      </div>
      <form.AppField name="serviceMode">
        {(field) => (
          <field.SegmentedRadio
            legend={intl.formatMessage(commonMessages.serviceMode)}
            options={modeOptions(voucherDay)}
          />
        )}
      </form.AppField>
      <EditObservationField form={form} fields={OBSERVATION} />
      <FormActions onCancel={close} />
      <SlowWriteNotice slow={slowWrite.slow} />
    </Form>
  );
}
