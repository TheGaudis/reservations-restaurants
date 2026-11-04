import { useState } from "react";

/**
 * New `requestId` (02 § 5.3). `crypto.randomUUID` needs Safari 15.4 (R-22); older browsers get the old site's
 * fallback.
 */
export function newRequestId(source: Partial<Pick<Crypto, "randomUUID">> = crypto): string {
  if (typeof source.randomUUID === "function") return source.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * `requestId` of a booking form (02 § 5.3, invariant 3): created when the form mounts, the same for every new attempt
 * and through the refreshes, new at the next opening (the form is mounted with a `key`). Never set again: the state
 * has no setter.
 */
export function useRequestId(): string {
  const [requestId] = useState(newRequestId);
  return requestId;
}
