import { Button as BaseButton } from "@base-ui/react/button";
import type { ReactNode } from "react";

import styles from "@/ui/button/IconButton.module.css";

export interface IconButtonProps extends Omit<
  BaseButton.Props,
  "className" | "render" | "nativeButton" | "children" | "aria-label"
> {
  /** The only name of the button: an icon says nothing to a screen reader (08 § 4.4). Already formatted by `intl`. */
  "aria-label": string;
  /** `tonal`: accent-tinted background, the ‹ › of the calendars (08 § 4.4). */
  tone?: "standard" | "tonal" | undefined;
  /** Layout from the parent; colours and sizes stay here. */
  className?: string | undefined;
  /** An icon of `ui/icons.tsx`. */
  children: ReactNode;
}

/** Round icon button of the charter (08 § 4.4): 40 px, 48 px touch target, `type="button"`. */
export function IconButton({ tone = "standard", className, children, ...props }: IconButtonProps) {
  return (
    <BaseButton
      {...props}
      data-tone={tone}
      className={className === undefined ? styles["button"] : `${styles["button"]} ${className}`}
    >
      {children}
    </BaseButton>
  );
}
