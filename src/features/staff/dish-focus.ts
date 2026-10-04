// Focus keys and ids of the dish forms (E-48, ui/pending-focus.ts). A form opened by its button focuses its first field;
// the button that opened it takes the focus back when the form closes. After a deletion, `focusCardDate`
// (features/calendar/card-date-focus.ts) hands the focus to the date of the card.

/** Form « Ajouter un plat » and its button. */
export const ADD_FORM = "add-form";
export const ADD_BUTTON = "add-button";

/** Form « Modifier ce plat » of a dish. */
export function editTarget(dishId: string): string {
  return `edit:${dishId}`;
}

/** Ids tying « Modifier ce plat » to its form (`aria-controls`): one R2 card in the page. */
export function editButtonId(dishId: string): string {
  return `dish-edit-${dishId}`;
}

export function editFormId(dishId: string): string {
  return `dish-form-${dishId}`;
}
