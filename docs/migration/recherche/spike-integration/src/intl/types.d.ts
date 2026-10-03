import type messages from "@translations/fr.json";

import type { formats } from "@/intl/formats";

declare global {
  namespace FormatjsIntl {
    interface Message {
      ids: keyof typeof messages;
    }
    interface Formats {
      number: keyof (typeof formats)["number"];
      date: keyof (typeof formats)["date"];
    }
  }
}
