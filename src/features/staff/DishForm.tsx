import { useNavigate } from "@tanstack/react-router";
import { defineMessages, useIntl } from "react-intl";

import { portionsBooked } from "@/domain/capacity";
import { dishDraftOf, emptyDishDraft } from "@/domain/dishes";
import type { PageSearchParams } from "@/domain/navigation";
import type { Dish, IsoDate } from "@/domain/types";
import { focusCardDate } from "@/features/calendar/card-date-focus";
import { DayActions } from "@/features/calendar/DayCard";
import { usePageNavigate, usePageSearch } from "@/features/calendar/page-search";
import {
  ADD_BUTTON,
  ADD_FORM,
  editButtonId,
  editFormId,
  editTarget,
  focusEditButton,
  focusFirstField,
  requestFocus,
  takeFocusRequest,
} from "@/features/staff/dish-focus";
import { bookingsOfDish } from "@/features/staff/dish-rules";
import { DishFields } from "@/features/staff/DishFields";
import { useStaffState } from "@/features/staff/use-staff-state";
import { commonMessages } from "@/intl/common-messages";
import { staffCommonMessages } from "@/intl/staff-messages";
import { useAddDish, useDeleteDish, useEditDish } from "@/mutations/staff/dishes";
import { staffErrorText } from "@/mutations/staff/write";
import { Button } from "@/ui/button/Button";
import { ConfirmButton } from "@/ui/button/ConfirmButton";
import { showToast } from "@/ui/feedback/toast";

import styles from "@/features/staff/DishForm.module.css";

// « Ajouter un plat » starts empty (06 § 6.1).
const EMPTY_DISH = emptyDishDraft();

// Dishes of the R2 staff card (06 § 6, 05 § 6.2-6.3, C-14, C-20 to C-22): « Modifier ce plat » and « Supprimer ce
// plat » in the actions of each dish, its form under them, « + Ajouter un plat à ce jour » or its form under the list.
// Each open form is a search param (`editPlat`, `ajoutPlat`, PLAN § 3.2).

const messages = defineMessages<{
  edit: Record<string, never>;
  delete: Record<string, never>;
  deleteDetail: Record<string, never>;
  deleteWithBookings: { n: number };
  add: Record<string, never>;
  addSubmit: Record<string, never>;
}>({
  edit: {
    id: "staff.dish.edit",
    defaultMessage: "Modifier ce plat",
    description: "05 § 6.3, 06 § 6.3 — bouton d'un plat de la fiche R2 collègue",
  },
  delete: {
    id: "staff.dish.delete",
    defaultMessage: "Supprimer ce plat",
    description: "05 § 6.3, 06 § 6.4 — bouton de suppression d'un plat (deux clics)",
  },
  deleteDetail: {
    id: "staff.dish.delete.confirm",
    defaultMessage: "Confirmer la suppression de ce plat",
    description: "06 § 5.2 — aria-label et title du bouton armé d'un plat sans réservation",
  },
  deleteWithBookings: {
    id: "staff.dish.delete.confirmWithBookings",
    defaultMessage:
      "Confirmer la suppression de ce plat ({n, plural, one {# réservation ne sera plus affichée} other {# réservations ne seront plus affichées}}, les personnes ne seront pas prévenues)",
    description:
      "PLAN annexe F, D-21 — note et aria-label du bouton armé d'un plat qui a des réservations",
  },
  add: {
    id: "staff.dish.add.open",
    defaultMessage: "+ Ajouter un plat à ce jour",
    description: "06 § 6.2 — bouton sous la liste des plats de la fiche R2 collègue",
  },
  addSubmit: {
    id: "staff.dish.add.submit",
    defaultMessage: "Ajouter ce plat",
    description: "06 § 6.2 — bouton d'envoi de l'ajout d'un plat",
  },
});

/** Leaves the URL in `replace`, from the search params current when the answer comes, not those of the render. */
function useCloseForm() {
  const navigate = useNavigate();
  return (close: (search: PageSearchParams) => PageSearchParams) => {
    void navigate({ to: ".", search: close, replace: true, resetScroll: false });
  };
}

/** Toast of a failed dish write: the script's message as is (« Plat introuvable. »), or D-14. */
function showFailure(error: unknown) {
  const text = staffErrorText(error);
  if (text !== null) showToast(text, "error");
}

/** « Supprimer ce plat » (06 § 6.4): two clicks; the armed button details the bookings left orphaned (D-21, E-38). */
function DeleteDishButton({ dish }: { dish: Dish }) {
  const intl = useIntl();
  const remove = useDeleteDish();
  const bookings = useStaffState((state) => bookingsOfDish(state, dish.id));
  const detail =
    bookings > 0
      ? intl.formatMessage(messages.deleteWithBookings, { n: bookings })
      : intl.formatMessage(messages.deleteDetail);
  async function confirm() {
    // The dish and this button leave the page with the answer: `mutateAsync` resolves all the same, the callbacks
    // given to `mutate` would not run. The card's date takes the focus (03 § 5.4, E-48).
    try {
      await remove.mutateAsync(dish.id);
      focusCardDate("r2");
    } catch (error) {
      showFailure(error);
    }
  }
  return (
    <span className={styles["slot"]}>
      <ConfirmButton
        size="small"
        detail={detail}
        showDetail={bookings > 0}
        busy={remove.isPending}
        onConfirm={() => {
          void confirm();
        }}
      >
        {intl.formatMessage(messages.delete)}
      </ConfirmButton>
    </span>
  );
}

/** « Modifier ce plat » and « Supprimer ce plat », after « + Ajouter une personne » in the dish actions (05 § 6.3). */
export function DishActions({ dish }: { dish: Dish }) {
  const intl = useIntl();
  const search = usePageSearch();
  const navigate = usePageNavigate();
  const editing = search.editPlat === dish.id;
  return (
    <>
      <Button
        id={editButtonId(dish.id)}
        size="small"
        aria-expanded={editing}
        aria-controls={editing ? editFormId(dish.id) : undefined}
        onClick={() => {
          if (editing) return;
          requestFocus(editTarget(dish.id));
          navigate({ ...search, editPlat: dish.id }, { replace: false });
        }}
      >
        {intl.formatMessage(messages.edit)}
      </Button>
      <DeleteDishButton dish={dish} />
    </>
  );
}

function EditDishFormOpen({ dish }: { dish: Dish }) {
  const intl = useIntl();
  const edit = useEditDish();
  const booked = useStaffState((state) => portionsBooked(state, dish.id));
  const closeForm = useCloseForm();
  const close = () => {
    focusEditButton(dish.id);
    closeForm((search) =>
      search.editPlat === dish.id ? { ...search, editPlat: undefined } : search,
    );
  };
  return (
    <DishFields
      id={editFormId(dish.id)}
      initial={dishDraftOf(dish)}
      booked={booked}
      adding={false}
      submitLabel={intl.formatMessage(commonMessages.save)}
      pendingLabel={intl.formatMessage(commonMessages.saving)}
      save={async (input) => {
        try {
          await edit.mutateAsync({ ...input, dishId: dish.id }, { onSuccess: close });
        } catch (error) {
          showFailure(error);
        }
      }}
      cancel={close}
      wrapperRef={focusFirstField(editTarget(dish.id))}
    />
  );
}

/**
 * Form « Modifier ce plat » (06 § 6.3), under the form « Ajouter une personne » of the dish, while `editPlat={dish id}`.
 * Saved or cancelled: closed, focus back on « Modifier ce plat » (E-48).
 */
export function EditDishForm({ dish }: { dish: Dish }) {
  const search = usePageSearch();
  if (search.editPlat !== dish.id) return null;
  return <EditDishFormOpen key={dish.id} dish={dish} />;
}

function AddDishFormOpen({ iso }: { iso: IsoDate }) {
  const intl = useIntl();
  const add = useAddDish();
  const closeForm = useCloseForm();
  const close = () => {
    requestFocus(ADD_BUTTON);
    closeForm((search) =>
      search.ajoutPlat === true ? { ...search, ajoutPlat: undefined } : search,
    );
  };
  return (
    <DishFields
      initial={EMPTY_DISH}
      booked={0}
      adding
      submitLabel={intl.formatMessage(messages.addSubmit)}
      pendingLabel={intl.formatMessage(staffCommonMessages.adding)}
      save={async (input) => {
        try {
          await add.mutateAsync({ ...input, date: iso }, { onSuccess: close });
        } catch (error) {
          showFailure(error);
        }
      }}
      cancel={close}
      wrapperRef={focusFirstField(ADD_FORM)}
    />
  );
}

/**
 * « + Ajouter un plat à ce jour » under the dish list, or its form in its place while `ajoutPlat` (06 § 6.2). Added or
 * cancelled: closed, focus back on the button (E-48).
 */
export function AddDish({ iso }: { iso: IsoDate }) {
  const intl = useIntl();
  const search = usePageSearch();
  const navigate = usePageNavigate();
  if (search.ajoutPlat === true) return <AddDishFormOpen key={iso} iso={iso} />;
  return (
    <DayActions>
      <Button
        ref={(button) => {
          if (button !== null && takeFocusRequest(ADD_BUTTON)) {
            button.focus({ preventScroll: true });
          }
        }}
        size="small"
        onClick={() => {
          requestFocus(ADD_FORM);
          navigate({ ...search, ajoutPlat: true }, { replace: false });
        }}
      >
        {intl.formatMessage(messages.add)}
      </Button>
    </DayActions>
  );
}
