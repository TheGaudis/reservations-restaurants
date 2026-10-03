import type { ReactNode } from "react";
import { FormattedMessage } from "react-intl";
import { expect, it } from "vitest";

import { renderWithProviders } from "@/test/render";

// Ad-hoc ids are not in translations/fr.json (typed ids): untyped alias for this test only.
const AdHocMessage = FormattedMessage as unknown as (props: {
  id: string;
  defaultMessage: string;
  description: string;
}) => ReactNode;

it("escaped non-breaking space: JSX attribute vs expression", async () => {
  const screen = await renderWithProviders(
    <div>
      <p data-testid="attr">
        <AdHocMessage id="t.ws.attr" defaultMessage="Lasagnes\u00A0— 4,50" description="test" />
      </p>
      <p data-testid="expr">
        <AdHocMessage id="t.ws.expr" defaultMessage={"Lasagnes\u00A0— 4,50"} description="test" />
      </p>
    </div>,
  );
  const text = (id: string) => screen.getByTestId(id).element().textContent;
  expect(text("attr")).toBe(String.raw`Lasagnes\u00A0— 4,50`);
  expect(text("expr")).toBe("Lasagnes\u00A0— 4,50");
});
