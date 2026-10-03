/** Query keys of the script state (PLAN § 3.3). */
export const stateKeys = {
  public: () => ["state", "public"] as const,
};
