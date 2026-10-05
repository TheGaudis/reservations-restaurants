import { FormattedMessage } from "react-intl";

import { APPS_SCRIPT_URL, isConfigMissing } from "@/config";
import { Alert } from "@/ui/feedback/Alert";

interface ConfigBannerProps {
  /** URL of the script deployment; the URL of the build by default. */
  url?: string;
}

/**
 * Red banner at the top of the page when the script URL is absent, not a deployment URL or still the placeholder
 * (G-05, D-05, a-25, E-29). Shown to everyone, in « vous »; the variable to set is in the README and the console.
 */
export function ConfigBanner({ url = APPS_SCRIPT_URL }: ConfigBannerProps) {
  if (!isConfigMissing(url)) return null;
  return (
    <Alert variant="banner">
      <FormattedMessage
        id="loading.configBanner"
        defaultMessage="Configuration manquante : l'adresse du service de réservation n'est pas renseignée ou n'est pas valide. Prévenez l'établissement."
        description="PLAN annexe F, D-05 — bandeau de configuration manquante (« ⚠ » dessiné par une icône)"
      />
    </Alert>
  );
}
