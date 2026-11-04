import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { RawIntlProvider } from "react-intl";
import { render } from "vitest-browser-react";

import { intl } from "@/intl/intl";
import { createQueryClient } from "@/queries/client";

export async function renderWithProviders(ui: ReactNode) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <RawIntlProvider value={intl}>{ui}</RawIntlProvider>
    </QueryClientProvider>,
  );
}
