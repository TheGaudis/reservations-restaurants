import { useState } from "react";

import { newRequestId } from "@/api/request-id";

/**
 * `requestId` of a booking form (02 § 5.3, invariant 3): created when the form mounts, the same for every new attempt
 * and through the refreshes, new at the next opening (the form is mounted with a `key`). Never set again: the state
 * has no setter.
 */
export function useRequestId(): string {
  const [requestId] = useState(newRequestId);
  return requestId;
}
