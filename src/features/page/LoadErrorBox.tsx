import { useState } from "react";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";

import { useOnline } from "@/features/page/use-online";
import { Button } from "@/ui/button/Button";
import { Alert } from "@/ui/feedback/Alert";

const messages = defineMessages({
  retrying: {
    id: "loading.retry.pending",
    defaultMessage: "Nouvelle tentative…",
    description: "00 § 2.3, 03 § 3.2 — bouton « Réessayer » occupé",
  },
});

interface LoadErrorBoxProps {
  /** The page shows the local copy of the last visit: the box says so (03 § 3.1). */
  fromCache: boolean;
  /** Reads the script again; the button stays busy until it settles (03 § 3.2). */
  onRetry: () => Promise<unknown>;
}

/**
 * Box of a failed load (G-03, 03 § 3.1-3.2): what failed, in words that follow the connection, and « Réessayer ».
 * React writes the alert again only when its text changes: no new announcement on each failed refresh (a-21, E-42).
 */
export function LoadErrorBox({ fromCache, onRetry }: LoadErrorBoxProps) {
  const intl = useIntl();
  const online = useOnline();
  // Busy from the click to the end of this read only: a background refresh leaves the button alone (03 § 3.2).
  const [retrying, setRetrying] = useState(false);
  const retry = async () => {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };
  const action = (
    <Button
      variant="primary"
      busy={retrying}
      busyLabel={intl.formatMessage(messages.retrying)}
      onClick={() => {
        void retry();
      }}
    >
      <FormattedMessage
        id="loading.retry"
        defaultMessage="Réessayer"
        description="00 § 2.3, 03 § 3.2 — bouton de l'encadré d'échec de chargement"
      />
    </Button>
  );
  return (
    <Alert live="alert" action={action}>
      {online ? <OnlineText /> : <OfflineText />}
      {fromCache ? (
        <>
          <br />
          <FormattedMessage
            id="loading.failure.fromCache"
            defaultMessage="Le calendrier affiché date de votre dernière visite : les places restantes ont pu changer depuis."
            description="03 § 3.1 — suffixe de l'encadré d'échec quand la copie locale est affichée"
          />
        </>
      ) : null}
    </Alert>
  );
}

// Two messages per case and a <br> between them, as in 03 § 3.1 (PLAN § 3.10: no <br> inside a message).
function OnlineText() {
  return (
    <>
      <b>
        <FormattedMessage
          id="loading.failure.online.title"
          defaultMessage="Le service de réservation ne répond pas."
          description="03 § 3.1 — titre de l'encadré d'échec, en ligne"
        />
      </b>
      <br />
      <FormattedMessage
        id="loading.failure.online.body"
        defaultMessage="Réessayez dans un instant. Si le problème continue, prévenez l'établissement."
        description="03 § 3.1 — texte de l'encadré d'échec, en ligne"
      />
    </>
  );
}

function OfflineText() {
  return (
    <>
      <b>
        <FormattedMessage
          id="loading.failure.offline.title"
          defaultMessage="Vous semblez hors ligne."
          description="03 § 3.1 — titre de l'encadré d'échec, hors ligne"
        />
      </b>
      <br />
      <FormattedMessage
        id="loading.failure.offline.body"
        defaultMessage="Vérifiez votre connexion internet, puis réessayez."
        description="03 § 3.1 — texte de l'encadré d'échec, hors ligne"
      />
    </>
  );
}
