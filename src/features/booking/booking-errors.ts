import { defineMessage } from "react-intl";

import { errorMessage } from "@/api/errors";
import { intl } from "@/intl/intl";

const offlineMessage = defineMessage({
  id: "common.error.offline",
  defaultMessage: "Vous semblez hors ligne. Vérifiez votre connexion internet, puis réessayez.",
  description: "D-14, 03 § 3.1 — écriture qui échoue hors ligne",
});

const serviceUnavailableMessage = defineMessage({
  id: "public.error.serviceUnavailable",
  defaultMessage:
    "Le service de réservation ne répond pas. Réessayez dans un instant : une même réservation n'est jamais enregistrée deux fois.",
  description: "PLAN annexe F, D-14 — réservation publique : service muet ou réponse illisible",
});

/**
 * Toast of a public booking that failed (04 § 6.3, D-14): the script's message as is; for a technical failure,
 * never the browser's English text (a-3) but the offline text or the « service muet » text.
 */
export function bookingErrorText(error: unknown): string {
  const message = errorMessage(error);
  if (message !== null) return message;
  return intl.formatMessage(navigator.onLine ? serviceUnavailableMessage : offlineMessage);
}
