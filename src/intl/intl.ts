import { createElement } from "react";
import { createIntl, createIntlCache } from "react-intl";

import { formats } from "@/intl/formats";

// Single instance: RawIntlProvider in the router, and outside components (toasts, document.title, aria-label).
export const intl = createIntl(
  {
    locale: "fr-FR",
    defaultLocale: "fr-FR",
    formats,
    defaultRichTextElements: {
      b: (chunks) => createElement("b", null, chunks),
      i: (chunks) => createElement("i", null, chunks),
    },
    // A descriptor stored in a plain variable is not precompiled and fails here in production (PLAN § 3.10):
    // the E2E console check turns this into a test failure.
    onError: (error) => {
      console.error(error);
    },
  },
  createIntlCache(),
);
