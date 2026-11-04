import { queryOptions } from "@tanstack/react-query";
import * as v from "valibot";

import { PublicState } from "@/api/schemas";
import { APPS_SCRIPT_URL } from "@/config";

export const stateKeys = {
  public: () => ["state", "public"] as const,
};

export const publicStateOptions = queryOptions({
  queryKey: stateKeys.public(),
  queryFn: async ({ signal }): Promise<PublicState> => {
    const response = await fetch(APPS_SCRIPT_URL, { signal });
    return v.parse(PublicState, await response.json());
  },
  staleTime: 180_000,
  gcTime: Number.POSITIVE_INFINITY,
});
