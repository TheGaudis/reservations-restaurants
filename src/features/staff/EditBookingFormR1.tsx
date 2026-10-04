import { useId } from "react";
import { defineMessages } from "react-intl";

import { editBookingR1Input, maxSeatsForEdit } from "@/domain/bookings";
import type { BookingR1Values, SeatCountValues } from "@/domain/bookings";
import { seatTotal } from "@/domain/pricing";
import type { BookingR1, FullState } from "@/domain/types";
import { countValue } from "@/domain/validation";
import { SlowWriteNotice } from "@/features/booking/SlowWriteNotice";
import { useSlowWrite } from "@/features/booking/use-slow-write";
import { SeatCountersR1 } from "@/features/r1/SeatCountersR1";
import { editResaValue } from "@/features/staff/booking-line";
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
import { isCapacityRefusal, useEditBookingR1 } from "@/mutations/staff/bookings";
import { showStaffError } from "@/mutations/staff/write";
import { useAppForm } from "@/ui/form/app-form";
import { setServerErrors } from "@/ui/form/errors";
import { Form } from "@/ui/form/Form";

import styles from "@/features/staff/EditBookingForm.module.css";

const messages = defineMessages<{
  maxSeats: { count: number };
  beforePrices: { count: number };
}>({
  maxSeats: {
    id: "staff.editBooking.r1.maxSeats",
    defaultMessage:
      "{count, plural, one {# couvert} other {# couverts}} au maximum pour cette réservation (places restantes ce jour-là).",
    description: "06 § 7.3 — total au-delà du maximum d'une réservation R1 modifiée (editMaxR1)",
  },
  beforePrices: {
    id: "staff.editBooking.r1.beforePrices",
    defaultMessage:
      "Réservation enregistrée avant les tarifs : indiquez la répartition de ses {count, plural, one {# couvert} other {# couverts}}.",
    description:
      "06 § 7.3 — aide sous la légende quand aucun compteur de la réservation n'est supérieur à 0",
  },
});

const NAME = { name: "name", className: "className" } as const;
const CONTACT = { contact: "contact" } as const;
const OBSERVATION = { observation: "observation" } as const;
const SEATS = {
  students: "students",
  staffMembers: "staffMembers",
  externals: "externals",
} as const;

/** Message of the row of counters (06 § 7.3): no seat, or more than the maximum of this booking. */
function seatRowError(values: SeatCountValues, max: number): string | null {
  const seats = seatTotal({
    students: countValue(values.students),
    staffMembers: countValue(values.staffMembers),
    externals: countValue(values.externals),
  });
  if (seats <= 0) return intl.formatMessage(commonMessages.atLeastOnePerson);
  if (seats > max) return intl.formatMessage(messages.maxSeats, { count: max });
  return null;
}

/** Rules of 06 § 7.2-7.3 in one validator; the row message on each counter, shown once under the row. */
function editR1Rules(value: BookingR1Values, max: number) {
  const seatMessage = seatRowError(value, max);
  const seats =
    seatMessage === null
      ? {}
      : { students: seatMessage, staffMembers: seatMessage, externals: seatMessage };
  const fields = { ...editIdentityErrors(value), ...seats };
  return Object.keys(fields).length === 0 ? undefined : { fields };
}

/** Values of the booking; counters null on the bookings made before the prices stay empty (06 § 7.3). */
function valuesOf(booking: BookingR1): BookingR1Values {
  return {
    ...identityOf(booking),
    students: booking.students,
    staffMembers: booking.staffMembers,
    externals: booking.externals,
  };
}

/** None of the three counters above 0: a booking made before the prices (06 § 7.3). */
function madeBeforePrices(booking: BookingR1): boolean {
  return [booking.students, booking.staffMembers, booking.externals].every(
    (count) => countValue(count) <= 0,
  );
}

function useEditFormR1(booking: BookingR1, close: () => void) {
  const edit = useEditBookingR1();
  const slowWrite = useSlowWrite();
  const prices = useStaffState((state: FullState) => state.settings);
  const max = useStaffState((state: FullState) => maxSeatsForEdit(state, booking));
  const form = useAppForm({
    defaultValues: valuesOf(booking),
    validators: {
      onDynamic: ({ value }: { value: BookingR1Values }) => editR1Rules(value, max),
    },
    onSubmit: async ({ value, formApi }) => {
      slowWrite.start();
      try {
        await edit.mutateAsync(editBookingR1Input(booking.id, value, prices), {
          onSuccess: close,
        });
      } catch (error) {
        if (isCapacityRefusal(error)) {
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
  return { form, max, prices, slowWrite };
}

interface EditBookingFormR1Props {
  booking: BookingR1;
}

/**
 * « Modifier » of an R1 booking, under its row (06 § 7.3, C-11): identity, the three counters with the prices of the
 * settings, the maximum of `editMaxR1` (seats left plus the booking's own, D-19) and the live total, the observation.
 * The values follow a refresh until a field changes, then stay as typed (03 § 5.4). Success: toast « Réservation
 * modifiée. », form closed; failure: the script's message under the counters (seats) or in a toast.
 */
export function EditBookingFormR1({ booking }: EditBookingFormR1Props) {
  const close = useCloseEditBooking(editResaValue("r1", booking.id));
  const { form, max, prices, slowWrite } = useEditFormR1(booking, close);
  const errorId = useId();
  const help = madeBeforePrices(booking)
    ? intl.formatMessage(messages.beforePrices, { count: booking.seats })
    : "";
  return (
    <Form form={form} className={styles["form"]}>
      <EditNameFields form={form} fields={NAME} />
      <EditContactField form={form} fields={CONTACT} />
      <SeatCountersR1
        form={form}
        fields={SEATS}
        max={max}
        prices={prices}
        errorId={errorId}
        help={help}
      />
      <EditObservationField form={form} fields={OBSERVATION} />
      <FormActions onCancel={close} />
      <SlowWriteNotice slow={slowWrite.slow} />
    </Form>
  );
}
