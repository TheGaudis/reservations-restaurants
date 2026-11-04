import { defineMessage, FormattedMessage, useIntl } from "react-intl";

import { addItemR2, deleteItemR2, editItemR2 } from "@/api/actions";
import { portionsBooked } from "@/domain/capacity";
import { dishDraftOf, emptyDishDraft } from "@/domain/dishes";
import type { Dish, IsoDate } from "@/domain/types";
import { focusCardDate } from "@/features/calendar/card-date-focus";
import { DayActions } from "@/features/calendar/DayCard";
import { useCloseForm, usePageNavigate, usePageSearch } from "@/features/calendar/page-search";
import { bookingsOfDish } from "@/features/staff/dish-rules";
import { DishFields } from "@/features/staff/DishFields";
import { useFullState } from "@/features/staff/use-staff-state";
import { saveAction, savingLabel } from "@/intl/common-messages";
import { addingLabel } from "@/intl/staff-messages";
import { showStaffError, useStaffWrite } from "@/mutations/staff/write";
import { Button } from "@/ui/button/Button";
import { ConfirmButton } from "@/ui/button/ConfirmButton";
import { focusById, focusFirstInput, focusOnMount, requestFocus } from "@/ui/pending-focus";

import styles from "@/features/staff/DishForm.module.css";

// Dishes of the R2 staff card (06 § 6, 05 § 6.2-6.3, C-14, C-20 to C-22): « Modifier ce plat » and « Supprimer ce
// plat » in the actions of each dish, its form under them, « + Ajouter un plat à ce jour » or its form under the list.
// Each open form is a search param (`editPlat`, `ajoutPlat`, PLAN § 3.2).
const addedMessage = defineMessage({
  id: "staff.dish.added",
  defaultMessage: "Plat ajouté.",
  description: "06 § 6.2, 02 § 4.7 — toast de succès de l'ajout d'un plat",
});

const editedMessage = defineMessage({
  id: "staff.dish.edited",
  defaultMessage: "Plat modifié.",
  description: "06 § 6.3, 02 § 4.7 — toast de succès de la modification d'un plat",
});

const deletedMessage = defineMessage({
  id: "staff.dish.deleted",
  defaultMessage: "Plat supprimé.",
  description: "06 § 5.2, § 6.4 — toast de succès de la suppression d'un plat",
});

const deleteDetailMessage = defineMessage({
  id: "staff.dish.delete.confirm",
  defaultMessage: "Confirmer la suppression de ce plat",
  description: "06 § 5.2 — aria-label et title du bouton armé d'un plat sans réservation",
});

const deleteWithBookingsMessage = defineMessage<{ n: number }>({
  id: "staff.dish.delete.confirmWithBookings",
  defaultMessage:
    "Confirmer la suppression de ce plat ({n, plural, one {# réservation ne sera plus affichée} other {# réservations ne seront plus affichées}}, les personnes ne seront pas prévenues)",
  description:
    "PLAN annexe F, D-21 — note et aria-label du bouton armé d'un plat qui a des réservations",
});

const addSubmitMessage = defineMessage({
  id: "staff.dish.add.submit",
  defaultMessage: "Ajouter ce plat",
  description: "06 § 6.2 — bouton d'envoi de l'ajout d'un plat",
});

// Focus keys and ids of the dish forms (E-48, ui/pending-focus.ts). A form opened by its button focuses its first field;
// the button that opened it takes the focus back when the form closes. After a deletion, `focusCardDate`
// (features/calendar/card-date-focus.ts) hands the focus to the date of the card.

/** Form « Ajouter un plat » and its button. */
const ADD_FORM = "add-form";
const ADD_BUTTON = "add-button";

/** Form « Modifier ce plat » of a dish. */
function editTarget(dishId: string): string {
  return `edit:${dishId}`;
}

/** Ids tying « Modifier ce plat » to its form (`aria-controls`): one R2 card in the page. */
function editButtonId(dishId: string): string {
  return `dish-edit-${dishId}`;
}

function editFormId(dishId: string): string {
  return `dish-form-${dishId}`;
}

// « Ajouter un plat » starts empty (06 § 6.1).
const EMPTY_DISH = emptyDishDraft();

/** « Supprimer ce plat » (06 § 6.4): two clicks; the armed button details the bookings left orphaned (D-21, E-38). */
function DeleteDishButton({ dish }: { dish: Dish }) {
  const intl = useIntl();
  // The bookings of the dish stay in the sheet, orphaned (06 § 5.2, b-3).
  const remove = useStaffWrite(deleteItemR2, { success: deletedMessage });
  const bookings = bookingsOfDish(useFullState(), dish.id);
  const detail =
    bookings > 0
      ? intl.formatMessage(deleteWithBookingsMessage, { n: bookings })
      : intl.formatMessage(deleteDetailMessage);
  async function confirm() {
    // The dish and this button leave the page with the answer: `mutateAsync` resolves all the same, the callbacks
    // given to `mutate` would not run. The card's date takes the focus (03 § 5.4, E-48).
    try {
      await remove.mutateAsync(dish.id);
      focusCardDate("r2");
    } catch (error) {
      showStaffError(error);
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
        <FormattedMessage
          id="staff.dish.delete"
          defaultMessage="Supprimer ce plat"
          description="05 § 6.3, 06 § 6.4 — bouton de suppression d'un plat (deux clics)"
        />
      </ConfirmButton>
    </span>
  );
}

/** « Modifier ce plat » and « Supprimer ce plat », after « + Ajouter une personne » in the dish actions (05 § 6.3). */
export function DishActions({ dish }: { dish: Dish }) {
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
        <FormattedMessage
          id="staff.dish.edit"
          defaultMessage="Modifier ce plat"
          description="05 § 6.3, 06 § 6.3 — bouton d'un plat de la fiche R2 collègue"
        />
      </Button>
      <DeleteDishButton dish={dish} />
    </>
  );
}

function EditDishFormOpen({ dish }: { dish: Dish }) {
  const intl = useIntl();
  // « Plat introuvable. » for a deleted dish (06 § 6.3).
  const edit = useStaffWrite(editItemR2, { success: editedMessage });
  const booked = portionsBooked(useFullState(), dish.id);
  const closeForm = useCloseForm();
  const close = () => {
    focusById(editButtonId(dish.id));
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
      submitLabel={intl.formatMessage(saveAction)}
      pendingLabel={intl.formatMessage(savingLabel)}
      save={async (input) => {
        try {
          await edit.mutateAsync({ ...input, dishId: dish.id }, { onSuccess: close });
        } catch (error) {
          showStaffError(error);
        }
      }}
      cancel={close}
      wrapperRef={focusOnMount(editTarget(dish.id), focusFirstInput)}
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
  // « Ce jour n'est pas ouvert. » for a deleted day (06 § 6.2).
  const add = useStaffWrite(addItemR2, { success: addedMessage });
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
      submitLabel={intl.formatMessage(addSubmitMessage)}
      pendingLabel={intl.formatMessage(addingLabel)}
      save={async (input) => {
        try {
          await add.mutateAsync({ ...input, date: iso }, { onSuccess: close });
        } catch (error) {
          showStaffError(error);
        }
      }}
      cancel={close}
      wrapperRef={focusOnMount(ADD_FORM, focusFirstInput)}
    />
  );
}

/**
 * « + Ajouter un plat à ce jour » under the dish list, or its form in its place while `ajoutPlat` (06 § 6.2). Added or
 * cancelled: closed, focus back on the button (E-48).
 */
export function AddDish({ iso }: { iso: IsoDate }) {
  const search = usePageSearch();
  const navigate = usePageNavigate();
  if (search.ajoutPlat === true) return <AddDishFormOpen key={iso} iso={iso} />;
  return (
    <DayActions>
      <Button
        ref={focusOnMount(ADD_BUTTON)}
        size="small"
        onClick={() => {
          requestFocus(ADD_FORM);
          navigate({ ...search, ajoutPlat: true }, { replace: false });
        }}
      >
        <FormattedMessage
          id="staff.dish.add.open"
          defaultMessage="+ Ajouter un plat à ce jour"
          description="06 § 6.2 — bouton sous la liste des plats de la fiche R2 collègue"
        />
      </Button>
    </DayActions>
  );
}
