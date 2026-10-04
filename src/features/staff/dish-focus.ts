// Focus around the dish forms (E-48). A form opened by its button focuses its first field; the button that opened it
// takes the focus back when the form closes. A form opened by a link or a reload leaves the focus alone. After a
// deletion, `focusCardDate` (features/calendar/card-date-focus.ts) hands the focus to the date of the card.

let pendingFocus: string | null = null;

/** The next element of `target` to mount takes the focus. */
export function requestFocus(target: string) {
  pendingFocus = target;
}

/** True once after `requestFocus(target)`: read by the element when it mounts. */
export function takeFocusRequest(target: string): boolean {
  if (pendingFocus !== target) return false;
  pendingFocus = null;
  return true;
}

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

/** « Modifier ce plat » of a dish, which stays in the page while its form is open. */
export function focusEditButton(dishId: string) {
  document
    .querySelector<HTMLElement>(`#${CSS.escape(editButtonId(dishId))}`)
    ?.focus({ preventScroll: true });
}

/** Ref callback of a form: its first field takes a pending focus request. */
export function focusFirstField(target: string) {
  return (element: HTMLElement | null) => {
    if (element !== null && takeFocusRequest(target)) {
      element.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
    }
  };
}
