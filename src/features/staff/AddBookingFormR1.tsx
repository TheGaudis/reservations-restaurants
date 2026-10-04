import { useId } from "react";

import { bookingR1Input } from "@/domain/bookings";
import type { BookingR1Values } from "@/domain/bookings";
import { remainingSeats } from "@/domain/capacity";
import type { FullState, StaffServiceDayR1 } from "@/domain/types";
import { identityErrors } from "@/features/booking/identity-rules";
import { IdentityFields, ObservationField } from "@/features/booking/IdentityFields";
import { SlowWriteNotice } from "@/features/booking/SlowWriteNotice";
import { useRequestId } from "@/features/booking/use-request-id";
import { useSlowWrite } from "@/features/booking/use-slow-write";
import { usePageSearch } from "@/features/calendar/page-search";
import { seatErrors } from "@/features/r1/seat-rules";
import { SeatCountersR1 } from "@/features/r1/SeatCountersR1";
import {
  addedToast,
  addFormId,
  addFormTarget,
  ajoutValue,
  showAddFailure,
  useCloseAddBooking,
} from "@/features/staff/add-booking";
import { AddBookingActions, AddPersonButton } from "@/features/staff/AddBookingParts";
import { focusFirstField } from "@/features/staff/dish-focus";
import { useStaffState } from "@/features/staff/use-staff-state";
import { isSeatsRefusal, useBookR1 } from "@/mutations/bookings";
import { showToast } from "@/ui/feedback/toast";
import { useAppForm } from "@/ui/form/app-form";
import { setServerErrors } from "@/ui/form/errors";
import { Form } from "@/ui/form/Form";

import styles from "@/features/staff/AddBookingForm.module.css";

// « + Ajouter une personne » of the R1 staff card (06 § 8.1-8.2, § 8.5; C-12), open while `ajout=r1`.

const AJOUT = ajoutValue();

const EMPTY: BookingR1Values = {
  name: "",
  contact: "",
  className: "",
  students: null,
  staffMembers: null,
  externals: null,
  observation: "",
};

const IDENTITY = { name: "name", contact: "contact", className: "className" } as const;
const SEATS = {
  students: "students",
  staffMembers: "staffMembers",
  externals: "externals",
} as const;
const OBSERVATION = { observation: "observation" } as const;

interface AddBookingR1Props {
  /** Selected R1 day, from the full state. */
  day: StaffServiceDayR1;
}

/** « + Ajouter une personne », first of the actions of the R1 card, only while seats are left, past days included (06 § 8). */
export function AddBookingButtonR1({ day }: AddBookingR1Props) {
  const remaining = useStaffState((state: FullState) => remainingSeats(state, day));
  if (remaining <= 0) return null;
  return <AddPersonButton ajout={AJOUT} />;
}

/** Rules of 06 § 8.1-8.2 in one validator: e-mail optional, the row of counters checked against the seats left. */
function addR1Rules(value: BookingR1Values, max: number) {
  const fields = { ...identityErrors(value, "staffAdd"), ...seatErrors(value, max) };
  return Object.keys(fields).length === 0 ? undefined : { fields };
}

/**
 * State and sending. `requestId` is created when the form opens and kept for every new attempt (invariant 3); no
 * password (02 § 4.4). The seats left follow the full state, refreshes included.
 */
function useAddFormR1(day: StaffServiceDayR1) {
  const requestId = useRequestId();
  const book = useBookR1();
  const slowWrite = useSlowWrite();
  const close = useCloseAddBooking(AJOUT);
  const max = useStaffState((state: FullState) => remainingSeats(state, day));
  const prices = useStaffState((state: FullState) => state.settings);
  const form = useAppForm({
    defaultValues: EMPTY,
    validators: {
      onDynamic: ({ value }: { value: BookingR1Values }) => addR1Rules(value, max),
    },
    onSubmit: async ({ value, formApi }) => {
      slowWrite.start();
      try {
        await book.mutateAsync(bookingR1Input({ date: day.date, requestId }, value), {
          onSuccess: (response) => {
            const toast = addedToast(response);
            showToast(toast.text, toast.kind);
            close();
          },
        });
      } catch (error) {
        if (isSeatsRefusal(error)) {
          const { message } = error;
          setServerErrors(formApi, {
            students: message,
            staffMembers: message,
            externals: message,
          });
        } else {
          showAddFailure(error);
        }
      } finally {
        slowWrite.stop();
      }
    },
  });
  return { form, max, prices, slowWrite, close };
}

function AddBookingFormR1Open({ day }: AddBookingR1Props) {
  const { form, max, prices, slowWrite, close } = useAddFormR1(day);
  const errorId = useId();
  return (
    <div
      id={addFormId(AJOUT)}
      ref={focusFirstField(addFormTarget(AJOUT))}
      className={styles["reveal"]}
    >
      <Form form={form} className={styles["form"]}>
        <IdentityFields form={form} fields={IDENTITY} variant="staffAdd" />
        <SeatCountersR1 form={form} fields={SEATS} max={max} prices={prices} errorId={errorId} />
        <ObservationField form={form} fields={OBSERVATION} />
        <AddBookingActions onCancel={close} />
        <SlowWriteNotice slow={slowWrite.slow} timerRef={slowWrite.clearOnUnmount} />
      </Form>
    </div>
  );
}

/**
 * Form « Ajouter une personne » under the actions of the R1 card (06 § 8.2, C-12): name and class, optional e-mail, the
 * three counters bounded by the seats left with the live total, observation. Sent by `addBookingR1` without password.
 * Success: toast of 06 § 8.5, form closed, focus back on « + Ajouter une personne » (E-48), the full state read again
 * to show the name. Failure: seats refused under the counters (a-5), else a toast (06 § 8.5, D-14); input and
 * `requestId` kept.
 */
export function AddBookingFormR1({ day }: AddBookingR1Props) {
  const search = usePageSearch();
  if (search.ajout !== AJOUT) return null;
  return <AddBookingFormR1Open key={day.date} day={day} />;
}
