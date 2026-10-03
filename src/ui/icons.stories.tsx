import type { ComponentType } from "react";
import { expect } from "storybook/test";

import {
  CalendarIcon,
  CheckIcon,
  ChevronNextIcon,
  ChevronPrevIcon,
  CloseIcon,
  ErrorIcon,
  ExpandMoreIcon,
  PrintIcon,
  PriorityHighIcon,
  SettingsIcon,
  SummaryCheckIcon,
  VisibilityIcon,
  VisibilityOffIcon,
  WarningIcon,
} from "@/ui/icons";

import preview from "../../.storybook/preview";

const ICONS: Array<[string, ComponentType]> = [
  ["PrintIcon", PrintIcon],
  ["SettingsIcon", SettingsIcon],
  ["SummaryCheckIcon", SummaryCheckIcon],
  ["CheckIcon", CheckIcon],
  ["PriorityHighIcon", PriorityHighIcon],
  ["VisibilityIcon", VisibilityIcon],
  ["VisibilityOffIcon", VisibilityOffIcon],
  ["CalendarIcon", CalendarIcon],
  ["ChevronPrevIcon", ChevronPrevIcon],
  ["ChevronNextIcon", ChevronNextIcon],
  ["ExpandMoreIcon", ExpandMoreIcon],
  ["CloseIcon", CloseIcon],
  ["ErrorIcon", ErrorIcon],
  ["WarningIcon", WarningIcon],
];

/** Every icon of 08 § 6.2, in the accent ink of the container (currentColor). */
function IconGallery() {
  return (
    <ul style={{ display: "grid", gap: "var(--space-3)", listStyle: "none", padding: 0 }}>
      {ICONS.map(([name, Icon]) => (
        <li
          key={name}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            color: "var(--accent-ink)",
          }}
        >
          <Icon />
          <code>{name}</code>
        </li>
      ))}
    </ul>
  );
}

const meta = preview.meta({ title: "ui/icons", component: IconGallery });

export const Blue = meta.story({
  play: async ({ canvasElement }) => {
    const hidden = [...canvasElement.querySelectorAll("svg")].map((icon) =>
      icon.getAttribute("aria-hidden"),
    );
    await expect(hidden).toStrictEqual(ICONS.map(() => "true"));
  },
});

export const Restaurant1 = meta.story({
  globals: { accent: "r1" },
  play: async ({ canvasElement }) => {
    const icon = canvasElement.querySelector("svg");
    // --ab-green-deep (#3B4F0D), accent ink of the green theme (08 § 2).
    await expect(icon).toHaveStyle({ color: "rgb(59, 79, 13)" });
  },
});

export const Restaurant2 = meta.story({
  globals: { accent: "r2" },
  play: async ({ canvasElement }) => {
    const icon = canvasElement.querySelector("svg");
    // --ab-magenta-ink (#86196A), accent ink of the magenta theme (08 § 2).
    await expect(icon).toHaveStyle({ color: "rgb(134, 25, 106)" });
  },
});
