import { Button as BaseButton } from "@base-ui/react/button";
import type { ReactNode } from "react";
import { FormattedMessage } from "react-intl";

import styles from "@/ui/button/Button.module.css";

/** `.btn`, `.primary`, `.ghost`, `.danger` of 08 § 4.2: one primary button per zone (08 § 8). */
export type ButtonVariant = "neutral" | "primary" | "ghost" | "danger";

/** `small`: 32 px, secondary actions of the staff lists; a main action and its « Annuler » keep the default (08 § 4.2). */
export type ButtonSize = "default" | "small";

export interface ButtonProps extends Omit<
  BaseButton.Props,
  "className" | "render" | "nativeButton" | "focusableWhenDisabled" | "children"
> {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  /**
   * Sending: `aria-busy`, waiting label, clicks ignored, focus kept on the button (08 § 4.2, E-04). The button looks
   * disabled but stays in the tab order, so the focus does not fall on the page.
   */
  busy?: boolean | undefined;
  /** Label while busy (08 § 4.2: « Nouvelle tentative… », « Enregistrement… »); defaults to « Envoi en cours… ». */
  busyLabel?: ReactNode;
  /** Layout from the parent (margins, alignment); colours and sizes stay here. */
  className?: string | undefined;
  children: ReactNode;
}

/** Button of the charter (08 § 4.2). `type="button"` unless `type="submit"` is passed. */
export function Button({
  variant = "neutral",
  size = "default",
  busy = false,
  busyLabel,
  disabled = false,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <BaseButton
      {...props}
      data-variant={variant}
      data-size={size}
      disabled={disabled || busy}
      focusableWhenDisabled={busy}
      aria-busy={busy || undefined}
      className={className === undefined ? styles["button"] : `${styles["button"]} ${className}`}
    >
      {busy
        ? (busyLabel ?? (
            <FormattedMessage
              id="ui.submitButton.pending"
              defaultMessage="Envoi en cours…"
              description="04 § 6.1 — libellé du bouton d'envoi pendant l'envoi"
            />
          ))
        : children}
    </BaseButton>
  );
}
