// Focus handed to an element that is not in the page yet (04 § 5.1, 06 § 1.2, E-12, E-48): the click that opens a form
// asks for it, the form takes it when it mounts. A form opened by a link or a reload finds no request and leaves the
// focus alone. One request at a time: the last click wins.

let pending: string | null = null;

/** The next element of `key` to mount takes the focus. */
export function requestFocus(key: string): void {
  pending = key;
}

/**
 * Forgets a request that no element took: each test starts without one.
 * @internal exported for the tests
 */
export function clearFocusRequest(): void {
  pending = null;
}

const focusElement = (element: HTMLElement) => {
  element.focus({ preventScroll: true });
};

/** Ref callback: takes a pending request for `key` and calls `focus(element)` (by default, focuses the element). */
export function focusOnMount(key: string, focus: (element: HTMLElement) => void = focusElement) {
  return (element: HTMLElement | null) => {
    if (element === null || pending !== key) return;
    pending = null;
    focus(element);
  };
}

/** Focuses the first `<input>` of the element, without scrolling: the first field of a form. */
export function focusFirstInput(element: HTMLElement): void {
  element.querySelector("input")?.focus({ preventScroll: true });
}

/** Focuses the element `id` without scrolling, when it is in the page: the button that opened a closing form (E-48). */
export function focusById(id: string): boolean {
  const element = document.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
  element?.focus({ preventScroll: true });
  return element !== null;
}
