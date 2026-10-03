import { FormattedMessage, FormattedNumber, RawIntlProvider } from "react-intl";
import { expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { commonMessages } from "@/intl/common-messages";
import { intl } from "@/intl/intl";

it("renders messages and amounts in Chromium (fr-FR)", async () => {
  const screen = await render(
    <RawIntlProvider value={intl}>
      <p data-testid="amount">
        <FormattedNumber value={12.5} format="euro" />
      </p>
      <button type="button">
        <FormattedMessage {...commonMessages.cancel} />
      </button>
    </RawIntlProvider>,
  );
  expect(screen.getByTestId("amount").element().textContent).toBe("12,50 €");
  await expect.element(screen.getByRole("button", { name: "Annuler" })).toBeVisible();
});
