import { fn } from "storybook/test";

import { NumberField } from "@/ui/NumberField";

import preview from "../../.storybook/preview";

const meta = preview.meta({
  component: NumberField,
  args: { label: "Couverts", value: 2, max: 5, onChange: fn() },
});

export const Accessible = meta.story();

/** Deliberate violation: an icon-only button without an accessible name. */
export const DeliberateViolation = meta.story({
  // Set to "error" to see the suite fail on button-name (verified).
  parameters: { a11y: { test: "todo" } },
  render: (args) => (
    <div>
      <NumberField {...args} />
      {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label -- deliberate violation for axe */}
      <button type="button" />
    </div>
  ),
});
