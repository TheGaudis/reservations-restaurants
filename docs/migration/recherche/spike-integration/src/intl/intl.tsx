import { createIntl, createIntlCache } from "react-intl";

import { formats } from "@/intl/formats";

export const intl = createIntl(
  {
    locale: "fr-FR",
    defaultLocale: "fr-FR",
    formats,
    defaultRichTextElements: { b: (chunks) => <b>{chunks}</b> },
    onError: (error) => {
      console.error(error);
    },
  },
  createIntlCache(),
);
