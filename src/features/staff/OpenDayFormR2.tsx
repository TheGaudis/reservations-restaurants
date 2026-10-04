import { useSelector } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { defineMessages, useIntl } from "react-intl";

import { useToday } from "@/background/clock";
import {
  dishDraftStatus,
  isR2DayOpen,
  openDateProblem,
  openDayDishes,
  priceSuggestions,
} from "@/domain/days";
import type { DishDraft, OpenDateProblem } from "@/domain/days";
import { selectDay } from "@/domain/navigation";
import type { PageSearchParams } from "@/domain/navigation";
import type { FullState, IsoDate, OpenDayR2Input } from "@/domain/types";
import { positiveAmount } from "@/domain/validation";
import { SlowWriteNotice } from "@/features/booking/SlowWriteNotice";
import { useSlowWrite } from "@/features/booking/use-slow-write";
import { newDishLine } from "@/features/staff/dish-lines";
import type { DishLine } from "@/features/staff/dish-lines";
import { DishDraftsR2 } from "@/features/staff/DishDraftsR2";
import { useOpenDate } from "@/features/staff/open-date";
import { OpenDatePicker } from "@/features/staff/OpenDatePicker";
import { OpenDayPanel } from "@/features/staff/OpenDayPanel";
import { useStaffState } from "@/features/staff/use-staff-state";
import { intl } from "@/intl/intl";
import { staffCommonMessages } from "@/intl/staff-messages";
import { useOpenDayR2 } from "@/mutations/staff/days";
import { staffErrorText } from "@/mutations/staff/write";
import { showToast } from "@/ui/feedback/toast";
import { useAppForm } from "@/ui/form/app-form";
import { Form } from "@/ui/form/Form";

import styles from "@/features/staff/OpenDayForm.module.css";

const messages = defineMessages({
  openedByPlaceholder: {
    id: "staff.openDay.r2.openedBy.placeholder",
    defaultMessage: "Ex. Cyrille Ungerer",
    description: "06 § 4.2 — exemple du collègue qui ouvre un jour R2",
  },
  noteLabel: {
    id: "staff.openDay.r2.note.label",
    defaultMessage: "Note (optionnel)",
    description: "06 § 4.2 — libellé de la note d'un jour R2",
  },
  notePlaceholder: {
    id: "staff.openDay.r2.note.placeholder",
    defaultMessage: "Ex. semaine du menu bistrot",
    description: "06 § 4.2 — exemple de note d'un jour R2",
  },
  themePlaceholder: {
    id: "staff.openDay.r2.theme.placeholder",
    defaultMessage: "Ex. semaine italienne",
    description: "06 § 4.2 — exemple de thème d'un jour R2",
  },
  alreadyOpen: {
    id: "staff.openDay.r2.alreadyOpen",
    defaultMessage: "Ce jour est déjà ouvert : seuls les plats de nom nouveau seront ajoutés.",
    description:
      "PLAN annexe F, D-19 — « Ouvrir un jour » R2 sur un jour déjà ouvert (avertissement)",
  },
  incompleteLine: {
    id: "staff.openDay.r2.incompleteLine",
    defaultMessage: "Indiquez le nom et le stock de ce plat, ou retirez la ligne.",
    description: "PLAN annexe F, D-19 — ligne de plat incomplète de « Ouvrir un jour » R2",
  },
  noDish: {
    id: "staff.openDay.r2.noDish",
    defaultMessage: "Ajoutez au moins un plat avec un nom et un stock.",
    description: "06 § 4.2 — aucune ligne de plat complète, message après la dernière ligne",
  },
  zeroPrice: {
    id: "staff.dish.error.zeroPrice",
    defaultMessage: "Indiquez un prix supérieur à 0, ou laissez le champ vide.",
    description: "PLAN annexe F, D-22 — champ Prix d'un plat",
  },
});

interface OpenDayR2Values {
  openedBy: string;
  note: string;
  theme: string;
  dishes: DishLine[];
}

// One empty line to start with, and after each day opened (06 § 4.2).
const EMPTY: OpenDayR2Values = { openedBy: "", note: "", theme: "", dishes: [newDishLine()] };

const DISHES = { dishes: "dishes" } as const;

const whole = (state: FullState): FullState => state;

/** `price-suggestions` of 06 § 6.1, written as a colleague types them (« 4,50 »), read back by `parseAmount`. */
function priceTexts(state: FullState): string[] {
  return priceSuggestions(state).map((price) =>
    intl.formatNumber(price, { minimumFractionDigits: 2, useGrouping: false }),
  );
}

/**
 * Rules of the dish lines (06 § 4.2, D-19, D-22): an incomplete line is refused under its missing name or stock, a
 * price in euros must be above 0, and without any complete line the message goes after the last one.
 */
function dishRules(dishes: readonly DishDraft[]): Record<string, string> {
  const fields: Record<string, string> = {};
  const zeroPrice = positiveAmount(intl.formatMessage(messages.zeroPrice));
  const statuses = dishes.map((dish) => dishDraftStatus(dish));
  for (const [index, dish] of dishes.entries()) {
    if (statuses[index] === "incomplete") {
      const missing = dish.name.trim() === "" ? "name" : "stock";
      fields[`dishes[${String(index)}].${missing}`] = intl.formatMessage(messages.incompleteLine);
    }
    const price = dish.voucher ? undefined : zeroPrice({ value: dish.price });
    if (price !== undefined) fields[`dishes[${String(index)}].price`] = price;
  }
  if (statuses.every((status) => status === "blank")) {
    fields[`dishes[${String(dishes.length - 1)}].name`] = intl.formatMessage(messages.noDish);
  }
  return fields;
}

function openDayR2Rules(value: OpenDayR2Values) {
  const fields = dishRules(value.dishes);
  return Object.keys(fields).length === 0 ? undefined : { fields };
}

/**
 * State and sending of the form (06 § 4.2). A past date sends nothing (D-19). After « Jour ajouté. », the panel
 * stays open on the date, the fields are emptied, the dishes back to one empty line, and the R2 calendar selects the
 * day opened; `selectDay` keeps `ouvrir`.
 */
function useOpenDayFormR2(date: IsoDate, problem: OpenDateProblem | null) {
  const openDay = useOpenDayR2();
  const slowWrite = useSlowWrite();
  const navigate = useNavigate();
  const form = useAppForm({
    defaultValues: EMPTY,
    validators: { onDynamic: ({ value }: { value: OpenDayR2Values }) => openDayR2Rules(value) },
    onSubmit: async ({ value, formApi }) => {
      if (problem !== null) return;
      const input: OpenDayR2Input = {
        date,
        note: value.note.trim(),
        theme: value.theme.trim(),
        openedBy: value.openedBy.trim(),
        dishes: openDayDishes(value.dishes),
      };
      slowWrite.start();
      try {
        await openDay.mutateAsync(input, {
          onSuccess: () => {
            formApi.reset();
            void navigate({
              to: ".",
              search: (previous: PageSearchParams) => selectDay(previous, "r2", date),
              replace: true,
              resetScroll: false,
            });
          },
        });
      } catch (error) {
        const text = staffErrorText(error);
        if (text !== null) showToast(text, "error");
      } finally {
        slowWrite.stop();
      }
    },
  });
  const sent = useSelector(form.store, (state) => state.submissionAttempts > 0);
  return { form, sent, slowWrite };
}

/** Content of the open panel: the date, then the fields and the dish lines of 06 § 4.2 in their order. */
function OpenDayBodyR2() {
  const { formatMessage } = useIntl();
  const date = useOpenDate("r2");
  const state = useStaffState(whole);
  const problem = openDateProblem(state, "r2", date, useToday());
  const { form, sent, slowWrite } = useOpenDayFormR2(date, problem);
  return (
    <Form form={form} className={styles["form"]}>
      <OpenDatePicker
        restaurant="r2"
        date={date}
        error={sent && problem !== null ? formatMessage(staffCommonMessages.pastDate) : null}
        warning={isR2DayOpen(state, date) ? formatMessage(messages.alreadyOpen) : null}
      />
      <form.AppField name="openedBy">
        {(field) => (
          <field.TextField
            label={formatMessage(staffCommonMessages.openedByLabel)}
            placeholder={formatMessage(messages.openedByPlaceholder)}
            autoComplete="name"
          />
        )}
      </form.AppField>
      <form.AppField name="note">
        {(field) => (
          <field.TextField
            label={formatMessage(messages.noteLabel)}
            placeholder={formatMessage(messages.notePlaceholder)}
          />
        )}
      </form.AppField>
      <form.AppField name="theme">
        {(field) => (
          <field.TextField
            label={formatMessage(staffCommonMessages.themeLabel)}
            placeholder={formatMessage(messages.themePlaceholder)}
          />
        )}
      </form.AppField>
      <DishDraftsR2 form={form} fields={DISHES} suggestions={priceTexts(state)} />
      <div className={styles["submit"]}>
        <form.SubmitButton pendingLabel={formatMessage(staffCommonMessages.opening)}>
          {formatMessage(staffCommonMessages.openDaySubmit)}
        </form.SubmitButton>
      </div>
      <SlowWriteNotice slow={slowWrite.slow} timerRef={slowWrite.clearOnUnmount} />
    </Form>
  );
}

/**
 * Slot `openDayR2` of `StaffPage` (06 § 4.2-4.3, C-05, C-06): « + Ouvrir un jour » above the R2 calendar, its form
 * with the dish lines while `ouvrir=r2`.
 */
export function OpenDayFormR2() {
  return (
    <OpenDayPanel restaurant="r2">
      <OpenDayBodyR2 />
    </OpenDayPanel>
  );
}
