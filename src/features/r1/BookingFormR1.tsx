import { useNavigate } from "@tanstack/react-router";
import { useCallback, useId } from "react";

import { bookingR1Input, summaryR1 } from "@/domain/bookings";
import type { BookingR1Values } from "@/domain/bookings";
import { findDay, remainingSeats } from "@/domain/capacity";
import type { BookingR1Input, IsoDate, WriteResponse } from "@/domain/types";
import { useBookingColumns } from "@/features/booking/booking-columns";
import { bookingErrorText } from "@/features/booking/booking-errors";
import { identityErrors } from "@/features/booking/identity-rules";
import { IdentityFields, ObservationField } from "@/features/booking/IdentityFields";
import { SlowWriteNotice } from "@/features/booking/SlowWriteNotice";
import { useRequestId } from "@/features/booking/use-request-id";
import { useSlowWrite } from "@/features/booking/use-slow-write";
import { DayActions } from "@/features/calendar/DayCard";
import { useShownState } from "@/features/calendar/use-shown-state";
import { seatErrors } from "@/features/r1/seat-rules";
import { SeatCountersR1 } from "@/features/r1/SeatCountersR1";
import { commonMessages } from "@/intl/common-messages";
import { intl } from "@/intl/intl";
import { isSeatsRefusal, useBookR1 } from "@/mutations/bookings";
import { Button } from "@/ui/button/Button";
import { showToast } from "@/ui/feedback/toast";
import { useAppForm } from "@/ui/form/app-form";
import { setServerErrors } from "@/ui/form/errors";
import { Form } from "@/ui/form/Form";

import styles from "@/features/r1/BookingFormR1.module.css";

// Every form starts empty (D-10, E-31).
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

/** Rules of 04 § 5.2 in one validator: every message at once, the row of counters checked against `max` (D-18). */
function bookingR1Rules(value: BookingR1Values, max: number) {
  const fields = { ...identityErrors(value, "public"), ...seatErrors(value, max) };
  return Object.keys(fields).length === 0 ? undefined : { fields };
}

/**
 * Opened by « Réserver »: focuses « Nom et prénom » without scrolling, and brings the form up when it opens in the
 * bottom 40 % of the window (04 § 5.1). A form opened by a link or a reload leaves the focus alone. Stable: React
 * would call a new ref callback at each render.
 */
function useFocusOnOpen() {
  const columns = useBookingColumns();
  const { takeFocusRequest } = columns;
  return useCallback(
    (element: HTMLDivElement | null) => {
      if (element === null || !takeFocusRequest("form", "r1")) return;
      element.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
      if (element.getBoundingClientRect().top > window.innerHeight * 0.6) {
        element.scrollIntoView({ block: "start" });
      }
    },
    [takeFocusRequest],
  );
}

/** `reserver=r1` leaves the URL (`replace`), unless the visitor already moved to another form. */
function useCloseForm() {
  const navigate = useNavigate({ from: "/" });
  return () => {
    void navigate({
      search: (previous) =>
        previous.reserver === "r1" ? { ...previous, reserver: undefined } : previous,
      replace: true,
      resetScroll: false,
    });
  };
}

/** After the answer, if the form is still there: summary, toast, form closed (04 § 6.3, § 7, D-16, E-12). */
function useDone() {
  const columns = useBookingColumns();
  const close = useCloseForm();
  return (input: BookingR1Input, response: WriteResponse) => {
    columns.show(summaryR1(input, response));
    if (response.duplicate) {
      showToast(intl.formatMessage(commonMessages.bookingDuplicate), "neutral");
    } else {
      showToast(intl.formatMessage(commonMessages.bookingConfirmed));
    }
    close();
  };
}

/**
 * State and sending of the form. `requestId` is created at mount, kept for every new attempt and through the
 * refreshes (invariant 3, 02 § 5.3); the seats left (`max`) follow the state shown (E-08).
 */
function useBookingFormR1(date: IsoDate) {
  const requestId = useRequestId();
  const book = useBookR1();
  const slowWrite = useSlowWrite();
  const done = useDone();
  const state = useShownState();
  const day = findDay(state.r1Days, date);
  const max = day === undefined ? 0 : remainingSeats(state, day);
  const form = useAppForm({
    defaultValues: EMPTY,
    validators: {
      onDynamic: ({ value }: { value: BookingR1Values }) => bookingR1Rules(value, max),
    },
    onSubmit: async ({ value, formApi }) => {
      const input = bookingR1Input({ date, requestId }, value);
      slowWrite.start();
      try {
        await book.mutateAsync(input, {
          onSuccess: (response) => {
            done(input, response);
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
          showToast(bookingErrorText(error), "error");
        }
      } finally {
        slowWrite.stop();
      }
    },
  });
  return { form, max, prices: state.settings, slowWrite };
}

interface BookingFormR1Props {
  /** Day of the form, written in the URL by « Réserver »: it stays the same past midnight (PLAN § 3.4). */
  date: IsoDate;
}

/**
 * R1 booking form under the day card (04 § 5.2, P-05), loaded on demand and mounted with `key={`r1:${date}`}`.
 * Success: summary with the focus on its title, toast, form closed; a duplicate gets the summary « déjà
 * enregistrée » (D-16). Failure: message under the counters for lack of seats, with the state read again (E-35),
 * else a toast; input and `requestId` kept (04 § 6.1). « Annuler » is disabled while sending (E-13) and gives the
 * focus back to « Réserver » (04 § 5.1).
 */
export function BookingFormR1({ date }: BookingFormR1Props) {
  const { form, max, prices, slowWrite } = useBookingFormR1(date);
  const errorId = useId();
  const columns = useBookingColumns();
  const focusOnOpen = useFocusOnOpen();
  const close = useCloseForm();
  return (
    <div ref={focusOnOpen} className={styles["reveal"]}>
      <Form form={form} className={styles["form"]}>
        <IdentityFields form={form} fields={IDENTITY} variant="public" />
        <SeatCountersR1 form={form} fields={SEATS} max={max} prices={prices} errorId={errorId} />
        <ObservationField form={form} fields={OBSERVATION} />
        <DayActions>
          <form.SubmitButton>{intl.formatMessage(commonMessages.confirmBooking)}</form.SubmitButton>
          <form.Subscribe selector={(formState) => formState.isSubmitting}>
            {(sending) => (
              <Button
                variant="ghost"
                disabled={sending}
                onClick={() => {
                  columns.requestFocus("reserve", "r1");
                  close();
                }}
              >
                {intl.formatMessage(commonMessages.cancel)}
              </Button>
            )}
          </form.Subscribe>
        </DayActions>
        <SlowWriteNotice slow={slowWrite.slow} timerRef={slowWrite.clearOnUnmount} />
      </Form>
    </div>
  );
}
