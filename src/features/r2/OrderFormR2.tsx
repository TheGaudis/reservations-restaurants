import { useNavigate } from "@tanstack/react-router";
import { useCallback, useId } from "react";
import { defineMessages } from "react-intl";

import { syncClock } from "@/background/clock";
import { orderR2Input, summaryR2 } from "@/domain/bookings";
import type { OrderR2Values } from "@/domain/bookings";
import { dishesForDay, remainingStock } from "@/domain/capacity";
import { isR2OrderingClosed } from "@/domain/cutoff";
import type { Dish, IsoDate, OrderR2Input, ServiceMode, WriteResponse } from "@/domain/types";
import { dayHasVoucher, serviceMode } from "@/domain/vouchers";
import { useBookingColumns } from "@/features/booking/booking-columns";
import { bookingErrorText } from "@/features/booking/booking-errors";
import { identityErrors } from "@/features/booking/identity-rules";
import { IdentityFields, ObservationField } from "@/features/booking/IdentityFields";
import { SlowWriteNotice } from "@/features/booking/SlowWriteNotice";
import { useRequestId } from "@/features/booking/use-request-id";
import { useSlowWrite } from "@/features/booking/use-slow-write";
import { DayActions } from "@/features/calendar/DayCard";
import { useShownState } from "@/features/calendar/use-shown-state";
import { DishQuantitiesR2 } from "@/features/r2/DishQuantitiesR2";
import { dishErrors, orderablePortions } from "@/features/r2/order-rules";
import type { DishStock } from "@/features/r2/order-rules";
import { commonMessages } from "@/intl/common-messages";
import { intl } from "@/intl/intl";
import { useOrderR2 } from "@/mutations/bookings";
import { Button } from "@/ui/button/Button";
import { showToast } from "@/ui/feedback/toast";
import { useAppForm } from "@/ui/form/app-form";
import { Form } from "@/ui/form/Form";

import styles from "@/features/r2/OrderFormR2.module.css";

const messages = defineMessages({
  nothingConfirmed: {
    id: "public.r2.toast.nothingConfirmed",
    defaultMessage: "Aucun des plats choisis n'est disponible en quantité suffisante.",
    description:
      "04 § 6.3, § 9 — toast d'erreur : le script n'a accordé aucun plat (confirmed vide)",
  },
});

const IDENTITY = { name: "name", contact: "contact", className: "className" } as const;
const PORTIONS = { portions: "portions" } as const;
const OBSERVATION = { observation: "observation" } as const;

/**
 * Every form starts empty (D-10, E-31): no portion, « À emporter » chosen (`openBookingR2Day`, 04 § 5.1), shown as
 * « Sur place » on a voucher day (invariant 5).
 */
function orderDefaults(dishesOfDay: readonly Dish[]): OrderR2Values {
  return {
    serviceMode: serviceMode(dishesOfDay, "takeaway"),
    portions: Object.fromEntries(dishesOfDay.map((dish) => [dish.id, null] as const)),
    name: "",
    contact: "",
    className: "",
    observation: "",
  };
}

/** Rules of 04 § 5.3 in one validator: every message at once (dishes, then identity). */
function orderR2Rules(value: OrderR2Values, stocks: readonly DishStock[]) {
  const fields = { ...dishErrors(value.portions, stocks), ...identityErrors(value, "public") };
  return Object.keys(fields).length === 0 ? undefined : { fields };
}

/**
 * Cut-off checked again on sending, before the rules (04 § 5.3, invariant 4): past 10:00, the clock read again
 * closes the form with the neutral toast (`watchR2Cutoff`) and nothing is sent. True when closed.
 */
function closedOnSending(date: IsoDate): boolean {
  if (!isR2OrderingClosed(date, Date.now())) return false;
  syncClock();
  return true;
}

/**
 * Opened by « Réserver »: focuses the first quantity without scrolling, and brings the card into view when its top
 * is above the window (04 § 5.1, 05 § 6.4). A form opened by a link or a reload leaves the focus alone. Stable: React
 * would call a new ref callback at each render.
 */
function useFocusOnOpen() {
  const { takeFocusRequest } = useBookingColumns();
  return useCallback(
    (element: HTMLDivElement | null) => {
      if (element === null || !takeFocusRequest("form", "r2")) return;
      element
        .querySelector<HTMLInputElement>("[data-dishes] input[inputmode]")
        ?.focus({ preventScroll: true });
      const card = element.parentElement ?? element;
      if (card.getBoundingClientRect().top < 0) card.scrollIntoView({ block: "start" });
    },
    [takeFocusRequest],
  );
}

/** `reserver=r2` leaves the URL (`replace`), unless the visitor already moved to another form. */
function useCloseForm() {
  const navigate = useNavigate({ from: "/" });
  return () => {
    void navigate({
      search: (previous) =>
        previous.reserver === "r2" ? { ...previous, reserver: undefined } : previous,
      replace: true,
      resetScroll: false,
    });
  };
}

/**
 * After the answer, if the form is still there (04 § 6.3, § 7, D-16, E-11, E-12): nothing confirmed keeps the form
 * and its input under an error toast, the state of the answer already shows what is left; otherwise summary with the
 * portions granted, toast, form closed.
 */
function useDone() {
  const columns = useBookingColumns();
  const close = useCloseForm();
  return (input: OrderR2Input, response: WriteResponse, dishesOfDay: readonly Dish[]) => {
    const summary = summaryR2(input, response, dishesOfDay);
    if (summary === null) {
      showToast(intl.formatMessage(messages.nothingConfirmed), "error");
      return;
    }
    columns.show(summary);
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
 * refreshes (invariant 3, 02 § 5.3); the dishes and their portions left follow the state shown (E-08).
 */
function useOrderFormR2(date: IsoDate) {
  const requestId = useRequestId();
  const order = useOrderR2();
  const slowWrite = useSlowWrite();
  const done = useDone();
  const state = useShownState();
  const dishesOfDay = dishesForDay(state, date);
  const stocks = dishesOfDay.map((dish) => ({ dish, remaining: remainingStock(state, dish) }));
  const form = useAppForm({
    defaultValues: orderDefaults(dishesOfDay),
    validators: {
      onDynamic: ({ value }: { value: OrderR2Values }) => orderR2Rules(value, stocks),
    },
    onSubmitInvalid: () => {
      closedOnSending(date);
    },
    onSubmit: async ({ value }) => {
      if (closedOnSending(date)) return;
      const portions = orderablePortions(value.portions, stocks);
      const input = orderR2Input({ date, requestId }, { ...value, portions }, dishesOfDay);
      slowWrite.start();
      try {
        await order.mutateAsync(input, {
          onSuccess: (response) => {
            done(input, response, dishesOfDay);
          },
        });
      } catch (error) {
        showToast(bookingErrorText(error), "error");
      } finally {
        slowWrite.stop();
      }
    },
  });
  return { form, stocks, voucherDay: dayHasVoucher(dishesOfDay), slowWrite };
}

/** « À emporter » and « Sur place »; « Sur place » alone on a voucher day (04 § 5.3, invariant 5). */
function modeOptions(voucherDay: boolean): Array<{ value: ServiceMode; label: string }> {
  const dineIn = { value: "dineIn" as const, label: intl.formatMessage(commonMessages.dineIn) };
  if (voucherDay) return [dineIn];
  return [{ value: "takeaway", label: intl.formatMessage(commonMessages.takeaway) }, dineIn];
}

interface OrderFormR2Props {
  /** Day of the form, written in the URL by « Réserver »: it stays the same past midnight (PLAN § 3.4). */
  date: IsoDate;
}

/**
 * R2 order form under the day card (04 § 5.3, P-13), loaded on demand and mounted with `key={`r2:${date}`}`: service
 * mode, dishes and quantities with the live total, identity, observation. Success: summary with the portions granted
 * and both warnings when both apply (E-14), focus on its title, toast, form closed; a duplicate gets the summary
 * « déjà enregistrée » (D-16); nothing granted keeps the form (E-11). Failure: toast, input and `requestId` kept
 * (04 § 6.1). « Annuler » is disabled while sending (E-13) and gives the focus back to « Réserver » (04 § 5.1).
 */
export function OrderFormR2({ date }: OrderFormR2Props) {
  const { form, stocks, voucherDay, slowWrite } = useOrderFormR2(date);
  const errorId = useId();
  const columns = useBookingColumns();
  const focusOnOpen = useFocusOnOpen();
  const close = useCloseForm();
  return (
    <div ref={focusOnOpen} className={styles["reveal"]}>
      <Form form={form} className={styles["form"]}>
        <form.AppField name="serviceMode">
          {(field) => (
            <field.SegmentedRadio
              legend={intl.formatMessage(commonMessages.serviceMode)}
              hideLegend
              description={voucherDay ? intl.formatMessage(commonMessages.dineInOnly) : undefined}
              options={modeOptions(voucherDay)}
            />
          )}
        </form.AppField>
        <DishQuantitiesR2 form={form} fields={PORTIONS} dishes={stocks} errorId={errorId} />
        <IdentityFields form={form} fields={IDENTITY} variant="public" />
        <ObservationField form={form} fields={OBSERVATION} />
        <DayActions>
          <form.SubmitButton>{intl.formatMessage(commonMessages.confirmBooking)}</form.SubmitButton>
          <form.Subscribe selector={(formState) => formState.isSubmitting}>
            {(sending) => (
              <Button
                variant="ghost"
                disabled={sending}
                onClick={() => {
                  columns.requestFocus("reserve", "r2");
                  close();
                }}
              >
                {intl.formatMessage(commonMessages.cancel)}
              </Button>
            )}
          </form.Subscribe>
        </DayActions>
        <SlowWriteNotice slow={slowWrite.slow} />
      </Form>
    </div>
  );
}
