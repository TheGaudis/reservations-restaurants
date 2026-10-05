import addonA11y from "@storybook/addon-a11y";
import { definePreview } from "@storybook/react-vite";
import { QueryClientProvider } from "@tanstack/react-query";
import addonMsw from "msw-storybook-addon";
import { RawIntlProvider } from "react-intl";

import { intl } from "@/intl/intl";
import { handlers } from "@/mocks/apps-script";
import { createQueryClient } from "@/queries/client";

export default definePreview({
  addons: [addonA11y(), addonMsw()],
  parameters: { a11y: { test: "error" } },
  beforeEach: ({ msw }) => {
    msw.use(...handlers);
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={createQueryClient()}>
        <RawIntlProvider value={intl}>
          <Story />
        </RawIntlProvider>
      </QueryClientProvider>
    ),
  ],
});
