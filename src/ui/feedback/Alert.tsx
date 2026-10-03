import type { ReactNode } from "react";

import { ErrorIcon, WarningIcon } from "@/ui/icons";

import styles from "@/ui/feedback/Alert.module.css";

export interface AlertProps {
  /**
   * `box`: framed message with its icon and an action (`.alert`, 08 § 4.12, load failure of 03 § 3.1); `note`: short
   * warning inside a card (`.note-warning`, 08 § 4.13); `banner`: red strip at the top of the page (`.setup-banner`,
   * 08 § 4.20).
   */
  variant?: "box" | "note" | "banner" | undefined;
  /** State colour of a box or a note; a banner is always red. */
  tone?: "danger" | "warning" | undefined;
  /**
   * Role of the message: `alert` interrupts the screen reader (load failure, 08 § 7.6), `status` waits for a pause;
   * none for a text that is there from the start. Set on the text only, so the action stays out of the announcement.
   */
  live?: "alert" | "status" | undefined;
  /** Button next to the text of a box (« Réessayer », 03 § 3.2). */
  action?: ReactNode;
  /** The message, already formatted; a title in `<b>` takes the state colour. */
  children: ReactNode;
}

/** Message about a state of the page (08 § 4.12, 4.13, 4.20): the colour always comes with words (08 § 8). */
export function Alert({ variant = "box", tone = "danger", live, action, children }: AlertProps) {
  if (variant === "note") {
    return (
      <p className={styles["note"]} data-tone={tone} role={live}>
        {children}
      </p>
    );
  }
  if (variant === "banner") {
    return (
      <div className={styles["banner"]} role={live}>
        <WarningIcon />
        <span>{children}</span>
      </div>
    );
  }
  return (
    <div className={styles["box"]} data-tone={tone}>
      <span className={styles["icon"]} aria-hidden="true">
        {tone === "warning" ? <WarningIcon /> : <ErrorIcon />}
      </span>
      <p className={styles["text"]} role={live}>
        {children}
      </p>
      {action}
    </div>
  );
}
