/**
 * `requestId` of a booking form (`newRequestId`, 02 § 5.3): created when the form opens, kept for every new
 * attempt. `crypto.randomUUID` needs Safari 15.4 (R-22); older browsers get the old site's fallback.
 */
export function newRequestId(source: Partial<Pick<Crypto, "randomUUID">> = crypto): string {
  if (typeof source.randomUUID === "function") return source.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
