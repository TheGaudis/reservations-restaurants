import { useId } from "react";
import { defineMessage } from "react-intl";

import { editBookingR1, editBookingR2 } from "@/api/actions";
import {
  editBookingR1Input,
  editBookingR2Input,
  maxPortionsForEdit,
  maxSeatsForEdit,
} from "@/domain/bookings";
import type { BookingR1Values, SeatCountValues } from "@/domain/bookings";
import { dishesForDay } from "@/domain/capacity";
import { seatTotal } from "@/domain/pricing";
import type { BookingR1, BookingR2, Dish, ServiceMode } from "@/domain/types";
import { countValue, required } from "@/domain/validation";
import { dayHasVoucher } from "@/domain/vouchers";
import { SlowWriteNotice } from "@/features/booking/SlowWriteNotice";
import { useSlowWrite } from "@/features/booking/use-slow-write";
import { useCloseForm } from "@/features/calendar/page-search";
import { SeatCountersR1 } from "@/features/r1/SeatCountersR1";
import { editResaValue } from "@/features/staff/booking-line";
import { FormActions } from "@/features/staff/FormActions";
import { modeOptions, portionsErrors } from "@/features/staff/staff-helpers";
import { useFullState } from "@/features/staff/use-staff-state";
import {
  atLeastOnePersonMessage,
  classLabel,
  observationLabel,
  quantityDecrementLabel,
  quantityIncrementLabel,
  serviceModeLabel,
} from "@/intl/common-messages";
import { intl } from "@/intl/intl";
import { staffClassRequiredMessage, staffNameRequiredMessage } from "@/intl/staff-messages";
import { isCapacityRefusal, showStaffError, useStaffWrite } from "@/mutations/staff/write";
import { readStateAgainOn } from "@/queries/state";
import { useAppForm } from "@/ui/form/app-form";
import { setServerErrors } from "@/ui/form/errors";
import { Form } from "@/ui/form/Form";
import { focusById } from "@/ui/pending-focus";

import styles from "@/features/staff/EditBookingForm.module.css";

// « Modifier » of a booking, under its row (06 § 7.2-7.4, C-11, C-24), open while `editResa` names it (PLAN § 3.2).

const editedMessage = defineMessage({
  id: "staff.booking.edited",
  defaultMessage: "Réservation modifiée.",
  description: "06 § 7.3, § 7.4 — toast de succès d'une modification de réservation",
});

const nameLabel = defineMessage({
  id: "staff.editBooking.name.label",
  defaultMessage: "Nom",
  description: "06 § 7.2 — libellé du nom d'une réservation modifiée",
});

const contactLabel = defineMessage({
  id: "staff.editBooking.contact.label",
  defaultMessage: "Téléphone ou email",
  description: "06 § 7.2 — libellé du contact d'une réservation modifiée (R1 et R2)",
});

const contactRequiredMessage = defineMessage({
  id: "staff.editBooking.contact.required",
  defaultMessage: "Indiquez un téléphone ou un email.",
  description: "06 § 7.2 — contact vide",
});

const maxSeatsMessage = defineMessage<{ count: number }>({
  id: "staff.editBooking.r1.maxSeats",
  defaultMessage:
    "{count, plural, one {# couvert} other {# couverts}} au maximum pour cette réservation (places restantes ce jour-là).",
  description: "06 § 7.3 — total au-delà du maximum d'une réservation R1 modifiée (editMaxR1)",
});

const beforePricesMessage = defineMessage<{ count: number }>({
  id: "staff.editBooking.r1.beforePrices",
  defaultMessage:
    "Réservation enregistrée avant les tarifs : indiquez la répartition de ses {count, plural, one {# couvert} other {# couverts}}.",
  description:
    "06 § 7.3 — aide sous la légende quand aucun compteur de la réservation n'est supérieur à 0",
});

const portionsMessage = defineMessage({
  id: "staff.editBooking.r2.portions.label",
  defaultMessage: "Portions",
  description: "06 § 7.4 — libellé des portions d'une réservation R2 modifiée",
});

type EditBookingProps =
  | { restaurant: "r1"; booking: BookingR1 }
  | {
      restaurant: "r2";
      booking: BookingR2;
      /** Dish of the booking line: names the −/+ buttons of the portions (D-17). */
      dish: Dish;
    };

/** The R1 counters and the R2 portions and mode in one set of values; each restaurant reads its own fields. */
interface EditValues extends BookingR1Values {
  portions: number | null;
  serviceMode: ServiceMode;
}

const SEATS = {
  students: "students",
  staffMembers: "staffMembers",
  externals: "externals",
} as const;

/** Id of « Modifier » of a booking (`editResa` value): the edit form gives it the focus back when it closes (E-48). */
export function editBookingButtonId(editResa: string): string {
  return `edit-booking-${editResa}`;
}

/**
 * Values of the booking (06 § 7.2-7.4). R1 counters null on the bookings made before the prices stay empty; on a
 * voucher day the R2 mode is dine-in, whatever the booking said (invariant 5, D-19).
 */
function valuesOf(props: EditBookingProps, voucherDay: boolean): EditValues {
  const { booking } = props;
  const identity = {
    name: booking.name,
    className: booking.className,
    contact: booking.contact,
    observation: booking.observation,
  };
  if (props.restaurant === "r1") {
    const { students, staffMembers, externals } = props.booking;
    return {
      ...identity,
      students,
      staffMembers,
      externals,
      portions: null,
      serviceMode: "dineIn",
    };
  }
  return {
    ...identity,
    students: null,
    staffMembers: null,
    externals: null,
    portions: props.booking.portions,
    serviceMode: voucherDay ? "dineIn" : props.booking.serviceMode,
  };
}

/** None of the three counters above 0: a booking made before the prices (06 § 7.3). */
function madeBeforePrices(booking: BookingR1): boolean {
  return [booking.students, booking.staffMembers, booking.externals].every(
    (count) => countValue(count) <= 0,
  );
}

/** Message of the row of counters (06 § 7.3), on each counter: no seat, or more than the maximum of this booking. */
function seatErrors(
  values: SeatCountValues,
  max: number,
): Partial<Record<keyof SeatCountValues, string>> {
  const seats = seatTotal({
    students: countValue(values.students),
    staffMembers: countValue(values.staffMembers),
    externals: countValue(values.externals),
  });
  let message: string | null = null;
  if (seats <= 0) message = intl.formatMessage(atLeastOnePersonMessage);
  else if (seats > max) message = intl.formatMessage(maxSeatsMessage, { count: max });
  return message === null ? {} : { students: message, staffMembers: message, externals: message };
}

/**
 * Rules of 06 § 7.2-7.4 in one validator: name, class and contact required, the contact without any format check
 * (D-04 not retained); the R1 counters or the R2 portions within the maximum of this booking.
 */
function editRules(value: EditValues, restaurant: EditBookingProps["restaurant"], max: number) {
  const identity = {
    name: required(intl.formatMessage(staffNameRequiredMessage))({ value: value.name }),
    className: required(intl.formatMessage(staffClassRequiredMessage))({ value: value.className }),
    contact: required(intl.formatMessage(contactRequiredMessage))({ value: value.contact }),
  };
  const fields: Record<string, string> = {};
  for (const [key, message] of Object.entries(identity)) {
    if (message !== undefined) fields[key] = message;
  }
  Object.assign(
    fields,
    restaurant === "r1" ? seatErrors(value, max) : portionsErrors(value.portions, max),
  );
  return Object.keys(fields).length === 0 ? undefined : { fields };
}

/**
 * « Modifier » of a booking, under its row. R1 (06 § 7.3, C-11): identity, the three counters with the prices of the
 * settings, the maximum of `editMaxR1` (seats left plus the booking's own, D-19) and the live total, the observation.
 * R2 (06 § 7.4, C-24): identity, portions bounded by the stock left plus the line's own portions (D-19), service mode
 * (« Sur place » alone on a voucher day, D-19), observation; the dish itself does not change. The values follow a
 * refresh until a field changes, then stay as typed (03 § 5.4). Success: toast « Réservation modifiée. », form closed,
 * focus back on « Modifier » (E-48); failure: the script's message under the counters or the portions (a-5, the full
 * state read again, a-4) or in a toast.
 */
export function EditBookingForm(props: EditBookingProps) {
  const { restaurant, booking } = props;
  const editResa = editResaValue(restaurant, booking.id);
  const state = useFullState();
  const slowWrite = useSlowWrite();
  const closeForm = useCloseForm();
  const errorId = useId();
  const voucherDay = dayHasVoucher(dishesForDay(state, booking.date));
  const max =
    props.restaurant === "r1"
      ? maxSeatsForEdit(state, props.booking)
      : maxPortionsForEdit(state, props.booking);

  // The focus moves first: the button stays in the page while the form leaves it. Another form opened meanwhile stays
  // open.
  const close = () => {
    focusById(editBookingButtonId(editResa));
    closeForm((previous) =>
      previous.editResa === editResa ? { ...previous, editResa: undefined } : previous,
    );
  };

  const edit = useStaffWrite(
    async (password: string, value: EditValues) =>
      props.restaurant === "r1"
        ? editBookingR1(password, editBookingR1Input(props.booking.id, value, state.settings))
        : editBookingR2(
            password,
            editBookingR2Input(props.booking.id, {
              ...value,
              serviceMode: voucherDay ? "dineIn" : value.serviceMode,
            }),
          ),
    { success: editedMessage, onError: readStateAgainOn(isCapacityRefusal) },
  );

  const form = useAppForm({
    defaultValues: valuesOf(props, voucherDay),
    validators: {
      onDynamic: ({ value }: { value: EditValues }) => editRules(value, restaurant, max),
    },
    onSubmit: async ({ value, formApi }) => {
      slowWrite.start();
      try {
        await edit.mutateAsync(value, { onSuccess: close });
      } catch (error) {
        if (!isCapacityRefusal(error)) {
          showStaffError(error);
        } else if (restaurant === "r1") {
          const { message } = error;
          setServerErrors(formApi, {
            students: message,
            staffMembers: message,
            externals: message,
          });
        } else {
          setServerErrors(formApi, { portions: error.message });
        }
      } finally {
        slowWrite.stop();
      }
    },
  });

  const contactField = (
    <form.AppField name="contact">
      {(field) => (
        <field.TextField
          label={intl.formatMessage(contactLabel)}
          autoComplete="off"
          spellCheck={false}
        />
      )}
    </form.AppField>
  );

  return (
    <Form form={form} className={styles["form"]}>
      <div className={styles["row"]}>
        <form.AppField name="name">
          {(field) => <field.TextField label={intl.formatMessage(nameLabel)} autoComplete="off" />}
        </form.AppField>
        <form.AppField name="className">
          {(field) => <field.TextField label={intl.formatMessage(classLabel)} autoComplete="off" />}
        </form.AppField>
      </div>
      {props.restaurant === "r1" ? (
        <>
          {contactField}
          <SeatCountersR1
            form={form}
            fields={SEATS}
            max={max}
            prices={state.settings}
            errorId={errorId}
            help={
              madeBeforePrices(props.booking)
                ? intl.formatMessage(beforePricesMessage, { count: props.booking.seats })
                : ""
            }
          />
        </>
      ) : (
        <>
          <div className={styles["row"]}>
            {contactField}
            <form.AppField name="portions">
              {(field) => (
                <field.NumberField
                  label={intl.formatMessage(portionsMessage)}
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
          </div>
          <form.AppField name="serviceMode">
            {(field) => (
              <field.SegmentedRadio
                legend={intl.formatMessage(serviceModeLabel)}
                options={modeOptions(voucherDay)}
              />
            )}
          </form.AppField>
        </>
      )}
      <form.AppField name="observation">
        {(field) => <field.TextField label={intl.formatMessage(observationLabel)} />}
      </form.AppField>
      <FormActions onCancel={close} />
      <SlowWriteNotice slow={slowWrite.slow} />
    </Form>
  );
}
