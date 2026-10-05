import { errorMessage } from "@/api/errors";
import { commonMessages } from "@/intl/common-messages";
import { intl } from "@/intl/intl";

/**
 * Toast of a public booking that failed (04 § 6.3, D-14): the script's message as is; for a technical failure,
 * never the browser's English text (a-3) but the offline text or the « service muet » text.
 */
export function bookingErrorText(error: unknown): string {
  const message = errorMessage(error);
  if (message !== null) return message;
  return intl.formatMessage(
    navigator.onLine ? commonMessages.serviceUnavailable : commonMessages.offline,
  );
}
