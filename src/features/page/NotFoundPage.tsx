import { Link } from "@tanstack/react-router";
import { FormattedMessage } from "react-intl";

/** Page of the catch-all route (PLAN § 3.2, annexe F). */
export function NotFoundPage() {
  return (
    <main>
      <h1>
        <FormattedMessage
          id="common.notFound.title"
          defaultMessage="Page introuvable"
          description="PLAN annexe F — titre de la route attrape-tout"
        />
      </h1>
      <p>
        <Link to="/">
          <FormattedMessage
            id="common.notFound.home"
            defaultMessage="Revenir à l'accueil"
            description="PLAN annexe F — lien de la route attrape-tout vers la page publique"
          />
        </Link>
      </p>
    </main>
  );
}
