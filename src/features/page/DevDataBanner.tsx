import { FormattedMessage } from "react-intl";

import { Alert } from "@/ui/feedback/Alert";

// `pnpm dev:real` (mode `real`) only: the production build and `pnpm dev` drop the banner (PLAN § 3.11).
const REAL_DATA = import.meta.env.DEV && import.meta.env.MODE === "real";

/** Reminds the person in charge that `pnpm dev:real` reads and writes the real sheet (PLAN § 3.11, R-30). */
export function DevDataBanner() {
  if (!REAL_DATA) return null;
  return (
    <Alert variant="banner">
      <FormattedMessage
        id="dev.realDataBanner"
        defaultMessage="Données réelles"
        description="PLAN annexe F, § 3.11 — bandeau de pnpm dev:real"
      />
    </Alert>
  );
}
