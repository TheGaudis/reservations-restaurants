import { Toast } from "@base-ui/react/toast";

/** Kind of a toast (04 § 9, 08 § 4.14): green with a check for a success or a neutral note, red with « ! » for an error. */
export type ToastKind = "success" | "neutral" | "error";

/** Manager shared by `Toaster` and the code outside React (mutations, background tasks). */
export const toastManager = Toast.createToastManager();

/**
 * Shows `message`, already formatted by `intl` or sent by the script, for 3.5 s. The new toast replaces the one on
 * screen (a-8, E-02); an error is announced at once, before what the screen reader was saying (R-16).
 */
export function showToast(message: string, kind: ToastKind = "success"): void {
  toastManager.close();
  toastManager.add({ title: message, type: kind, priority: kind === "error" ? "high" : "low" });
}
