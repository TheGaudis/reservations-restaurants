import { Toast } from "@base-ui/react/toast";
import { defineMessages, useIntl } from "react-intl";

import { TOAST_DURATION_MS } from "@/domain/constants";
import { toastManager } from "@/ui/feedback/toast";
import { CheckIcon, PriorityHighIcon } from "@/ui/icons";

import styles from "@/ui/feedback/Toaster.module.css";

const messages = defineMessages({
  viewport: {
    id: "ui.toast.viewport",
    defaultMessage: "Notifications",
    description: "PLAN annexe F, a-8 — nom de la zone des notifications",
  },
});

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => (
    // Nothing to act on in a toast: out of the tab order, like the legacy one. Base UI hides an error toast from
    // assistive technologies (an alert announces it), and a focusable hidden element breaks axe's aria-hidden-focus.
    <Toast.Root key={toast.id} toast={toast} tabIndex={-1} className={styles["toast"]}>
      <span className={styles["mark"]} aria-hidden="true">
        {toast.type === "error" ? <PriorityHighIcon /> : <CheckIcon />}
      </span>
      <Toast.Title className={styles["title"]} render={<p />} />
    </Toast.Root>
  ));
}

/**
 * Notification area of the page (08 § 4.14), mounted once at the root: shows what `showToast` adds, one toast at a
 * time (a-8), for 3.5 s. The F6 key of Base UI reaches it from the keyboard.
 */
export function Toaster() {
  const intl = useIntl();
  return (
    <Toast.Provider toastManager={toastManager} limit={1} timeout={TOAST_DURATION_MS}>
      <Toast.Portal>
        <Toast.Viewport
          className={styles["viewport"]}
          aria-label={intl.formatMessage(messages.viewport)}
        >
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}
