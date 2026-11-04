import { useId } from "react";
import { defineMessage, FormattedMessage } from "react-intl";

import { bookingR1Input, emailFailed, orderOutcome, orderR2Input } from "@/domain/bookings";
import type { BookingR1Values } from "@/domain/bookings";
import { dishesForDay, remainingSeats, remainingStock } from "@/domain/capacity";
import type {
  Dish,
  FullState,
  ServiceMode,
  StaffServiceDayR1,
  WriteResponse,
} from "@/domain/types";
import { dayHasVoucher } from "@/domain/vouchers";
import { identityErrors } from "@/features/booking/identity-rules";
import { IdentityFields, ObservationField } from "@/features/booking/IdentityFields";
import { SlowWriteNotice } from "@/features/booking/SlowWriteNotice";
import { useRequestId } from "@/features/booking/use-request-id";
import { useSlowWrite } from "@/features/booking/use-slow-write";
import { focusCardDate } from "@/features/calendar/card-date-focus";
import { useCloseForm, usePageNavigate, usePageSearch } from "@/features/calendar/page-search";
import { seatErrors } from "@/features/r1/seat-rules";
import { SeatCountersR1 } from "@/features/r1/SeatCountersR1";
import { FormActions } from "@/features/staff/FormActions";
import { modeOptions, portionsErrors } from "@/features/staff/staff-helpers";
import { useFullState } from "@/features/staff/use-staff-state";
import {
  quantityDecrementLabel,
  quantityIncrementLabel,
  serviceModeLabel,
} from "@/intl/common-messages";
import { intl } from "@/intl/intl";
import { addingLabel } from "@/intl/staff-messages";
import { isSeatsRefusal, useBookR1, useOrderR2 } from "@/mutations/bookings";
import { showStaffError } from "@/mutations/staff/write";
import { Button } from "@/ui/button/Button";
import { showToast } from "@/ui/feedback/toast";
import type { ToastKind } from "@/ui/feedback/toast";
import { useAppForm } from "@/ui/form/app-form";
import { setServerErrors } from "@/ui/form/errors";
import { Form } from "@/ui/form/Form";
import { focusById, focusFirstInput, focusOnMount, requestFocus } from "@/ui/pending-focus";

import styles from "@/features/staff/AddBookingForm.module.css";

// « + Ajouter une personne » of the R1 staff card (06 § 8.1-8.2, C-12) and of each dish of the R2 staff card (06 § 8.3,
// C-23). The form open is the search param `ajout` (`r1`, or `r2:{dish id}`, PLAN § 3.2), one at a time in the page.
// Sent by the public actions without password (`useBookR1`, `useOrderR2`): the answer is the public state, and
// mutations/bookings.ts reads the full state again while a session is open (06 § 8.5). No cutoff at 10:00: a
// colleague records an order taken on the spot (06 § 8.4).

const personAddedMessage = defineMessage({
  id: "staff.addBooking.success",
  defaultMessage: "Personne ajoutée.",
  description: "06 § 8.5 — toast de succès de l'ajout d'une personne",
});

const personDuplicateMessage = defineMessage({
  id: "staff.addBooking.duplicate",
  defaultMessage:
    "Cette personne était déjà enregistrée : elle n'a pas été ajoutée une seconde fois.",
  description: "06 § 8.5 — toast neutre d'un ajout en doublon (_duplicate)",
});

const emailFailedMessage = defineMessage({
  id: "staff.addBooking.emailFailed",
  defaultMessage: "L'email de confirmation n'a pas pu être envoyé.",
  description: "06 § 8.5 — suite du toast quand l'email de confirmation n'est pas parti",
});

const partialMessage = defineMessage<{ count: number }>({
  id: "staff.addBooking.r2.partial",
  defaultMessage:
    "Personne ajoutée avec {count, plural, one {# portion} other {# portions}} seulement (stock restant).",
  description:
    "06 § 8.3, § 8.5 — toast de succès quand le script accorde moins de portions que demandé",
});

const portionsMessage = defineMessage<{ max: number }>({
  id: "staff.addBooking.r2.portions.label",
  defaultMessage: "Portions ({max} au maximum)",
  description:
    "06 § 8.3 — libellé des portions de l'ajout d'une personne R2 (stock restant du plat)",
});

const noneConfirmedMessage = defineMessage({
  id: "staff.addBooking.r2.noneConfirmed",
  defaultMessage: "Plus assez de portions disponibles pour ce plat.",
  description:
    "06 § 8.3, 02 § 4.5 — erreur quand le script n'accorde aucune portion (confirmed vide)",
});

const submitMessage = defineMessage({
  id: "staff.addBooking.submit",
  defaultMessage: "Ajouter cette personne",
  description: "06 § 8.2, § 8.3 — bouton d'envoi de l'ajout d'une personne",
});

/** The R1 card (its selected day), or one dish of the R2 card. */
type AddBookingProps =
  | { restaurant: "r1"; day: StaffServiceDayR1 }
  | { restaurant: "r2"; dish: Dish };

/** The R1 counters and the R2 portions and mode in one set of values; each restaurant reads its own fields. */
interface AddValues extends BookingR1Values {
  portions: number | null;
  serviceMode: ServiceMode;
}

const IDENTITY = { name: "name", contact: "contact", className: "className" } as const;
const SEATS = {
  students: "students",
  staffMembers: "staffMembers",
  externals: "externals",
} as const;
const OBSERVATION = { observation: "observation" } as const;

/** Value of `ajout` for the R1 card, or for a dish of the R2 card. */
export function ajoutValue(dishId?: string): string {
  return dishId === undefined ? "r1" : `r2:${dishId}`;
}

function ajoutOf(props: AddBookingProps): string {
  return props.restaurant === "r1" ? ajoutValue() : ajoutValue(props.dish.id);
}

/** Seats left of the R1 day, or portions left of the dish (06 § 8). */
function remainingOf(state: FullState, props: AddBookingProps): number {
  return props.restaurant === "r1"
    ? remainingSeats(state, props.day)
    : remainingStock(state, props.dish);
}

/** Id of « + Ajouter une personne » (one staff card per restaurant in the page): the focus comes back to it (E-48). */
export function addButtonId(ajout: string): string {
  return `add-person-${ajout.replace(":", "-")}`;
}

/** Id of the form, for `aria-controls` of its button. */
function addFormId(ajout: string): string {
  return `add-person-form-${ajout.replace(":", "-")}`;
}

/** Focus key (ui/pending-focus.ts) of the form opened by its button: its first field takes the focus. */
function addFormTarget(ajout: string): string {
  return `add:${ajout}`;
}

/** Toast after a person was added (06 § 8.5). */
export interface AddedToast {
  text: string;
  kind: ToastKind;
}

/**
 * Toast of 06 § 8.5: a duplicate says so without being an error; else « Personne ajoutée. », or the partial R2 message
 * when the script granted fewer portions than asked (`granted`), followed by « L'email de confirmation n'a pas pu être
 * envoyé. » in the error style when the e-mail failed (`no-email` is not a failure).
 */
export function addedToast(
  response: WriteResponse,
  granted?: { asked: number; got: number },
): AddedToast {
  if (response.duplicate) {
    return { text: intl.formatMessage(personDuplicateMessage), kind: "neutral" };
  }
  const success =
    granted !== undefined && granted.got < granted.asked
      ? intl.formatMessage(partialMessage, { count: granted.got })
      : intl.formatMessage(personAddedMessage);
  if (!emailFailed(response.emailStatus)) return { text: success, kind: "success" };
  // Two sentences, as the old page joined them (collegue.js, afterAddBooking).
  const failure = intl.formatMessage(emailFailedMessage);
  return { text: `${success} ${failure}`, kind: "error" };
}

/**
 * « + Ajouter une personne » (small, 06 § 8), first of the actions of the R1 card or of a dish, only while seats or
 * portions are left, past days included. Opens its form in `push`, focus on « Nom et prénom » (04 § 5.1). Stays in the
 * page while the form is open (`aria-expanded`, 05 § 5.3), and takes the focus back when it closes (E-48). A second
 * click leaves the open form as it is.
 */
export function AddBookingButton(props: AddBookingProps) {
  const search = usePageSearch();
  const navigate = usePageNavigate();
  const remaining = remainingOf(useFullState(), props);
  if (remaining <= 0) return null;
  const ajout = ajoutOf(props);
  const open = search.ajout === ajout;
  return (
    <Button
      id={addButtonId(ajout)}
      size="small"
      aria-expanded={open}
      aria-controls={open ? addFormId(ajout) : undefined}
      onClick={() => {
        if (open) return;
        requestFocus(addFormTarget(ajout));
        navigate({ ...search, ajout }, { replace: false });
      }}
    >
      <FormattedMessage
        id="staff.addBooking.open"
        defaultMessage="+ Ajouter une personne"
        description="06 § 8 — ouverture de l'ajout d'une personne (fiche R1, plat R2)"
      />
    </Button>
  );
}

/** Rules of 06 § 8.1-8.3 in one validator: e-mail optional, the counters or the portions checked against what is left. */
function addRules(value: AddValues, props: AddBookingProps, max: number) {
  const capacity =
    props.restaurant === "r1" ? seatErrors(value, max) : portionsErrors(value.portions, max);
  const fields = { ...identityErrors(value, "staffAdd"), ...capacity };
  return Object.keys(fields).length === 0 ? undefined : { fields };
}

/**
 * The open form. `requestId` is created when the form opens and kept for every new attempt (invariant 3). The seats
 * or portions left follow the full state, refreshes included. On a voucher day the R2 mode is dine-in, whatever was
 * chosen (invariant 5, D-19).
 */
function AddBookingFormOpen(props: AddBookingProps) {
  const ajout = ajoutOf(props);
  const date = props.restaurant === "r1" ? props.day.date : props.dish.date;
  const requestId = useRequestId();
  const book = useBookR1();
  const order = useOrderR2();
  const slowWrite = useSlowWrite();
  const closeForm = useCloseForm();
  const errorId = useId();
  const state = useFullState();
  const max = remainingOf(state, props);
  const dishesOfDay = dishesForDay(state, date);
  const voucherDay = dayHasVoucher(dishesOfDay);

  // The button is gone when the last seat or portion was just taken: the date of the card takes the focus (03 § 5.4).
  // Another form opened meanwhile stays open.
  const close = () => {
    if (!focusById(addButtonId(ajout))) focusCardDate(props.restaurant);
    closeForm((previous) =>
      previous.ajout === ajout ? { ...previous, ajout: undefined } : previous,
    );
  };

  const sendR1 = async (value: AddValues) => {
    await book.mutateAsync(bookingR1Input({ date, requestId }, value), {
      onSuccess: (response) => {
        const toast = addedToast(response);
        showToast(toast.text, toast.kind);
        close();
      },
    });
  };

  // Nothing granted is an error, the form kept with its `requestId`: the script records it only when it granted
  // something (02 § 4.5).
  const sendR2 = async (value: AddValues, dish: Dish) => {
    const asked = value.portions ?? 0;
    const input = orderR2Input(
      { date, requestId },
      { ...value, portions: { [dish.id]: asked } },
      dishesOfDay,
    );
    await order.mutateAsync(input, {
      onSuccess: (response) => {
        if (orderOutcome(response) === "nothingConfirmed") {
          showToast(intl.formatMessage(noneConfirmedMessage), "error");
          return;
        }
        const confirmed = response.bookingResult?.confirmed.find((line) => line.dishId === dish.id);
        const toast = addedToast(response, { asked, got: confirmed?.portions ?? asked });
        showToast(toast.text, toast.kind);
        close();
      },
    });
  };

  const defaultValues: AddValues = {
    name: "",
    contact: "",
    className: "",
    students: null,
    staffMembers: null,
    externals: null,
    observation: "",
    portions: 1,
    serviceMode: voucherDay ? "dineIn" : "takeaway",
  };
  const form = useAppForm({
    defaultValues,
    validators: {
      onDynamic: ({ value }: { value: AddValues }) => addRules(value, props, max),
    },
    onSubmit: async ({ value, formApi }) => {
      slowWrite.start();
      try {
        await (props.restaurant === "r1" ? sendR1(value) : sendR2(value, props.dish));
      } catch (error) {
        if (isSeatsRefusal(error)) {
          const { message } = error;
          setServerErrors(formApi, {
            students: message,
            staffMembers: message,
            externals: message,
          });
        } else {
          showStaffError(error);
        }
      } finally {
        slowWrite.stop();
      }
    },
  });

  return (
    <div
      id={addFormId(ajout)}
      ref={focusOnMount(addFormTarget(ajout), focusFirstInput)}
      className={styles["reveal"]}
    >
      <Form form={form} className={styles["form"]}>
        <IdentityFields form={form} fields={IDENTITY} variant="staffAdd" />
        {props.restaurant === "r1" ? (
          <SeatCountersR1
            form={form}
            fields={SEATS}
            max={max}
            prices={state.settings}
            errorId={errorId}
          />
        ) : (
          <div className={styles["row"]}>
            <form.AppField name="portions">
              {(field) => (
                <field.NumberField
                  label={intl.formatMessage(portionsMessage, { max })}
                  min={1}
                  decrementLabel={intl.formatMessage(quantityDecrementLabel, {
                    name: props.dish.name,
                  })}
                  incrementLabel={intl.formatMessage(quantityIncrementLabel, {
                    name: props.dish.name,
                  })}
                />
              )}
            </form.AppField>
            <form.AppField name="serviceMode">
              {(field) => (
                <field.SegmentedRadio
                  legend={intl.formatMessage(serviceModeLabel)}
                  options={modeOptions(voucherDay)}
                />
              )}
            </form.AppField>
          </div>
        )}
        <ObservationField form={form} fields={OBSERVATION} />
        <FormActions
          onCancel={close}
          submitLabel={intl.formatMessage(submitMessage)}
          pendingLabel={intl.formatMessage(addingLabel)}
        />
        <SlowWriteNotice slow={slowWrite.slow} />
      </Form>
    </div>
  );
}

/**
 * Form « Ajouter une personne » under the actions of the R1 card (06 § 8.2, C-12) or of a dish (06 § 8.3, C-23): name
 * and class, optional e-mail, then for R1 the three counters bounded by the seats left with the live total, for R2 the
 * portions (1 by default, at most the stock left) and the service mode (« À emporter » by default, « Sur place » alone
 * on a voucher day); observation. Sent by `addBookingR1` or `addBookingR2Multi` (this dish only), without password.
 * Success: toast of 06 § 8.5 (partial when the script granted fewer portions), form closed, focus back on « + Ajouter
 * une personne » (E-48), the full state read again. Failure: R1 seats refused under the counters (a-5), else a toast
 * (D-14); input and `requestId` kept.
 */
export function AddBookingForm(props: AddBookingProps) {
  const search = usePageSearch();
  if (search.ajout !== ajoutOf(props)) return null;
  const key = props.restaurant === "r1" ? props.day.date : props.dish.id;
  return <AddBookingFormOpen key={key} {...props} />;
}
