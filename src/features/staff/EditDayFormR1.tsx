import { defineMessages, useIntl } from "react-intl";

import { BusinessError, PasswordRejectedError } from "@/api/errors";
import { seatsBooked } from "@/domain/capacity";
import type { EditDayR1Input, StaffServiceDayR1 } from "@/domain/types";
import { compose, parseCount, positiveInteger, required } from "@/domain/validation";
import { SlowWriteNotice } from "@/features/booking/SlowWriteNotice";
import { useSlowWrite } from "@/features/booking/use-slow-write";
import { useCloseForm, usePageNavigate, usePageSearch } from "@/features/calendar/page-search";
import { dayMessages } from "@/features/staff/day-messages";
import { FormActions } from "@/features/staff/FormActions";
import { useStaffState } from "@/features/staff/use-staff-state";
import { intl } from "@/intl/intl";
import { staffCommonMessages } from "@/intl/staff-messages";
import { useEditDayR1 } from "@/mutations/staff/days";
import { showStaffError } from "@/mutations/staff/write";
import { Button } from "@/ui/button/Button";
import { useAppForm } from "@/ui/form/app-form";
import { setServerErrors } from "@/ui/form/errors";
import { Form } from "@/ui/form/Form";
import { focusById } from "@/ui/pending-focus";

import styles from "@/features/staff/EditDayFormR1.module.css";

const messages = defineMessages({
  open: {
    id: "staff.editDay.open",
    defaultMessage: "Modifier ce jour",
    description:
      "05 § 5.3, 06 § 5.1 — bouton de la fiche R1 collègue qui ouvre « Modifier ce jour »",
  },
});

interface EditDayR1Props {
  /** Selected R1 day, from the full state. */
  day: StaffServiceDayR1;
}

interface EditDayR1Values {
  capacity: string;
  theme: string;
  menu: string;
}

// « Modifier ce jour » of the R1 card (one in the page): the form gives it the focus back when it closes (E-48).
const EDIT_BUTTON_ID = "edit-day-r1";

/**
 * « Modifier ce jour » in the actions of the R1 card, after « + Ajouter une personne » (05 § 5.3, C-13): opens the
 * form under the actions (`editJour=r1`, `push`), or closes it (`replace`). Past days keep it.
 */
export function EditDayButtonR1(_props: EditDayR1Props) {
  const search = usePageSearch();
  const navigate = usePageNavigate();
  const open = search.editJour === "r1";
  return (
    <Button
      id={EDIT_BUTTON_ID}
      size="small"
      aria-expanded={open}
      onClick={() => {
        navigate({ ...search, editJour: open ? undefined : "r1" }, { replace: open });
      }}
    >
      {intl.formatMessage(messages.open)}
    </Button>
  );
}

/** 06 § 5.1: a capacity above 0, and not under the seats already booked (D-19, message of the script). */
function editDayR1Rules(value: EditDayR1Values, booked: number) {
  const message = intl.formatMessage(dayMessages.capacityRequired);
  let capacity = compose(required(message), positiveInteger(message))({ value: value.capacity });
  if (capacity === undefined && parseCount(value.capacity) < booked) {
    capacity = intl.formatMessage(dayMessages.capacityBelowBooked, { used: String(booked) });
  }
  return capacity === undefined ? undefined : { fields: { capacity } };
}

/** `editJour` leaves the URL (`replace`); « Modifier ce jour » takes the focus first (E-48). */
function useCloseEditDay() {
  const closeForm = useCloseForm();
  return () => {
    focusById(EDIT_BUTTON_ID);
    closeForm((previous) => ({ ...previous, editJour: undefined }));
  };
}

/**
 * State and sending of the form (06 § 5.1). Success: « Jour modifié. », form closed. A refusal of the script (seats
 * booked in the meantime) goes under the capacity, and the state is read again (a-4).
 */
function useEditDayFormR1(day: StaffServiceDayR1) {
  const editDay = useEditDayR1();
  const slowWrite = useSlowWrite();
  const close = useCloseEditDay();
  const booked = useStaffState((state) => seatsBooked(state, day.date));
  const form = useAppForm({
    defaultValues: { capacity: String(day.capacity), theme: day.theme, menu: day.menu },
    validators: {
      onDynamic: ({ value }: { value: EditDayR1Values }) => editDayR1Rules(value, booked),
    },
    onSubmit: async ({ value, formApi }) => {
      const input: EditDayR1Input = {
        date: day.date,
        capacity: parseCount(value.capacity),
        menu: value.menu.trim(),
        theme: value.theme.trim(),
      };
      slowWrite.start();
      try {
        await editDay.mutateAsync(input, { onSuccess: close });
      } catch (error) {
        if (error instanceof BusinessError && !(error instanceof PasswordRejectedError)) {
          setServerErrors(formApi, { capacity: error.message });
        } else {
          showStaffError(error);
        }
      } finally {
        slowWrite.stop();
      }
    },
  });
  return { form, close, slowWrite };
}

function EditDayFormBody({ day }: EditDayR1Props) {
  const { formatMessage } = useIntl();
  const { form, close, slowWrite } = useEditDayFormR1(day);
  return (
    <Form form={form} className={styles["form"]}>
      <div className={styles["row"]}>
        <form.AppField name="capacity">
          {(field) => (
            <field.TextField
              label={formatMessage(dayMessages.capacityLabel)}
              type="number"
              min={1}
              inputMode="numeric"
            />
          )}
        </form.AppField>
        <form.AppField name="theme">
          {(field) => <field.TextField label={formatMessage(staffCommonMessages.themeLabel)} />}
        </form.AppField>
      </div>
      <form.AppField name="menu">
        {(field) => <field.TextField label={formatMessage(dayMessages.menuLabel)} />}
      </form.AppField>
      <FormActions onCancel={close} />
      <SlowWriteNotice slow={slowWrite.slow} />
    </Form>
  );
}

/**
 * Form « Modifier ce jour » at the bottom of the R1 card (05 § 5.3, 06 § 5.1, C-13), open while `editJour=r1`:
 * capacity, theme and menu of the day; « ouvert par » cannot change here. Saved or cancelled, it closes and gives the
 * focus back to « Modifier ce jour » (E-48). R2 has no such form (D-09 not retained).
 */
export function EditDayFormR1({ day }: EditDayR1Props) {
  const open = usePageSearch().editJour === "r1";
  if (!open) return null;
  return <EditDayFormBody key={day.date} day={day} />;
}
