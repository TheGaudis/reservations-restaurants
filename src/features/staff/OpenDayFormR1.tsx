import { useSelector } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { defineMessages, useIntl } from "react-intl";

import { useToday } from "@/background/clock";
import { openDateProblem } from "@/domain/days";
import type { OpenDateProblem } from "@/domain/days";
import { selectDay } from "@/domain/navigation";
import type { PageSearchParams } from "@/domain/navigation";
import type { FullState, IsoDate, OpenDayR1Input } from "@/domain/types";
import { compose, parseCount, positiveInteger, required } from "@/domain/validation";
import { SlowWriteNotice } from "@/features/booking/SlowWriteNotice";
import { useSlowWrite } from "@/features/booking/use-slow-write";
import { dayMessages } from "@/features/staff/day-messages";
import { useOpenDate } from "@/features/staff/open-date";
import { OpenDatePicker } from "@/features/staff/OpenDatePicker";
import { OpenDayPanel } from "@/features/staff/OpenDayPanel";
import { useStaffState } from "@/features/staff/use-staff-state";
import { intl } from "@/intl/intl";
import { staffCommonMessages } from "@/intl/staff-messages";
import { useOpenDayR1 } from "@/mutations/staff/days";
import { showStaffError } from "@/mutations/staff/write";
import { useAppForm } from "@/ui/form/app-form";
import { Form } from "@/ui/form/Form";

import styles from "@/features/staff/OpenDayForm.module.css";

const messages = defineMessages({
  openedByPlaceholder: {
    id: "staff.openDay.r1.openedBy.placeholder",
    defaultMessage: "Ex. M. Dupont",
    description: "06 § 4.1 — exemple du collègue qui ouvre un jour R1",
  },
  capacityPlaceholder: {
    id: "staff.openDay.r1.capacity.placeholder",
    defaultMessage: "Ex. 20",
    description: "06 § 4.1 — exemple de capacité d'un jour R1",
  },
  themePlaceholder: {
    id: "staff.openDay.r1.theme.placeholder",
    defaultMessage: "Ex. cuisine italienne",
    description: "06 § 4.1 — exemple de thème d'un jour R1",
  },
  menuPlaceholder: {
    id: "staff.openDay.r1.menu.placeholder",
    defaultMessage: "Ex. menu gastronomique, classe TS2",
    description: "06 § 4.1 — exemple de menu d'un jour R1",
  },
  alreadyOpen: {
    id: "staff.openDay.r1.alreadyOpen",
    defaultMessage: "Ce jour est déjà ouvert : utilisez « Modifier ce jour ».",
    description:
      "PLAN annexe F, D-19 — « Ouvrir un jour » R1 sur un jour déjà ouvert (envoi bloqué)",
  },
});

interface OpenDayR1Values {
  openedBy: string;
  capacity: string;
  theme: string;
  menu: string;
}

const EMPTY: OpenDayR1Values = { openedBy: "", capacity: "", theme: "", menu: "" };

const whole = (state: FullState): FullState => state;

/** 06 § 4.1: the capacity is the only field to check; the date has its own rules (`openDateProblem`). */
function openDayR1Rules(value: OpenDayR1Values) {
  const message = intl.formatMessage(dayMessages.capacityRequired);
  const capacity = compose(required(message), positiveInteger(message))({ value: value.capacity });
  return capacity === undefined ? undefined : { fields: { capacity } };
}

/** Message of a refused date (D-19). */
function problemText(problem: OpenDateProblem): string {
  return problem === "past"
    ? intl.formatMessage(staffCommonMessages.pastDate)
    : intl.formatMessage(messages.alreadyOpen);
}

/**
 * State and sending of the form (06 § 4.1). A refused date sends nothing (D-19). After « Jour ajouté. », the panel
 * stays open on the date, the other fields are emptied and the R1 calendar selects the day opened (collegue.js
 * l. 276-277); `selectDay` keeps `ouvrir`.
 */
function useOpenDayFormR1(date: IsoDate, problem: OpenDateProblem | null) {
  const openDay = useOpenDayR1();
  const slowWrite = useSlowWrite();
  const navigate = useNavigate();
  const form = useAppForm({
    defaultValues: EMPTY,
    validators: { onDynamic: ({ value }: { value: OpenDayR1Values }) => openDayR1Rules(value) },
    onSubmit: async ({ value, formApi }) => {
      if (problem !== null) return;
      const input: OpenDayR1Input = {
        date,
        capacity: parseCount(value.capacity),
        menu: value.menu.trim(),
        theme: value.theme.trim(),
        openedBy: value.openedBy.trim(),
      };
      slowWrite.start();
      try {
        await openDay.mutateAsync(input, {
          onSuccess: () => {
            formApi.reset();
            void navigate({
              to: ".",
              search: (previous: PageSearchParams) => selectDay(previous, "r1", date),
              replace: true,
              resetScroll: false,
            });
          },
        });
      } catch (error) {
        showStaffError(error);
      } finally {
        slowWrite.stop();
      }
    },
  });
  const sent = useSelector(form.store, (state) => state.submissionAttempts > 0);
  return { form, sent, slowWrite };
}

/** Content of the open panel: the date, then the fields of 06 § 4.1 in their order. */
function OpenDayBodyR1() {
  const { formatMessage } = useIntl();
  const date = useOpenDate("r1");
  const problem = openDateProblem(useStaffState(whole), "r1", date, useToday());
  const { form, sent, slowWrite } = useOpenDayFormR1(date, problem);
  return (
    <Form form={form} className={styles["form"]}>
      <OpenDatePicker
        restaurant="r1"
        date={date}
        error={sent && problem !== null ? problemText(problem) : null}
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
      <form.AppField name="capacity">
        {(field) => (
          <field.TextField
            label={formatMessage(dayMessages.capacityLabel)}
            placeholder={formatMessage(messages.capacityPlaceholder)}
            type="number"
            min={1}
            inputMode="numeric"
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
      <form.AppField name="menu">
        {(field) => (
          <field.TextField
            label={formatMessage(dayMessages.menuLabel)}
            placeholder={formatMessage(messages.menuPlaceholder)}
          />
        )}
      </form.AppField>
      <form.SubmitButton pendingLabel={formatMessage(staffCommonMessages.opening)}>
        {formatMessage(staffCommonMessages.openDaySubmit)}
      </form.SubmitButton>
      <SlowWriteNotice slow={slowWrite.slow} />
    </Form>
  );
}

/**
 * Slot `openDayR1` of `StaffPage` (06 § 4.1, C-04, C-05): « + Ouvrir un jour » above the R1 calendar, its form while
 * `ouvrir=r1`.
 */
export function OpenDayFormR1() {
  return (
    <OpenDayPanel restaurant="r1">
      <OpenDayBodyR1 />
    </OpenDayPanel>
  );
}
