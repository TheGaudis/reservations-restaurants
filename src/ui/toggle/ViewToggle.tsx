import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { useState } from "react";
import type { ReactNode } from "react";

import { CheckIcon } from "@/ui/icons";

import styles from "@/ui/toggle/ViewToggle.module.css";

interface ViewToggleItem<V extends string> {
  value: V;
  label: ReactNode;
  /** « Collègue » opens the login panel: it names that panel and says whether it is open (06 § 1.1). */
  "aria-controls"?: string | undefined;
  "aria-expanded"?: boolean | undefined;
}

export interface ViewToggleProps<V extends string> {
  /** Name of the group (08 § 6.3: « Mode d'accès », « Affichage du calendrier »), already formatted by `intl`. */
  "aria-label": string;
  items: ReadonlyArray<ViewToggleItem<V>>;
  value: V;
  /** A new item was chosen; pressing the current one again changes nothing (06 § 1.2). */
  onValueChange: (value: V) => void;
  /** `small`: 32 px, the calendar views (08 § 4.5). */
  size?: "default" | "small" | undefined;
  /** Takes the width of its container (`.seg-group.block`). */
  fullWidth?: boolean | undefined;
  /** Layout from the parent, and `--segment-min-width` (108 px segments of the header, 08 § 4.5). */
  className?: string | undefined;
}

/**
 * Choice between views, drawn as Material 3 segmented buttons (08 § 4.5, § 6.3): toggle buttons with `aria-pressed`
 * in a named group. Tab reaches the group, the arrow keys move between its buttons, Enter or Space chooses.
 */
export function ViewToggle<V extends string>({
  "aria-label": ariaLabel,
  items,
  value,
  onValueChange,
  size = "default",
  fullWidth = false,
  className,
}: ViewToggleProps<V>) {
  // Segment chosen by this user: it bounces once (`seg-pop` of 08 § 4.5).
  const [popped, setPopped] = useState<V | null>(null);
  return (
    <ToggleGroup
      aria-label={ariaLabel}
      value={[value]}
      onValueChange={(pressed) => {
        // A second click on the pressed segment empties the group (R-16): the view stays.
        const item = items.find((candidate) => candidate.value === pressed[0]);
        if (item === undefined) return;
        setPopped(item.value);
        onValueChange(item.value);
      }}
      data-size={size}
      data-full-width={fullWidth || undefined}
      className={className === undefined ? styles["group"] : `${styles["group"]} ${className}`}
    >
      {items.map((item) => (
        <Toggle
          key={item.value}
          value={item.value}
          aria-controls={item["aria-controls"]}
          aria-expanded={item["aria-expanded"]}
          data-pop={popped === item.value || undefined}
          className={styles["segment"]}
        >
          <span className={styles["check"]} aria-hidden="true">
            <CheckIcon />
          </span>
          <span>{item.label}</span>
        </Toggle>
      ))}
    </ToggleGroup>
  );
}
