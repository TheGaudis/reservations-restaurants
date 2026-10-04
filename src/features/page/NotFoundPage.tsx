import { Link } from "@tanstack/react-router";
import { FormattedMessage } from "react-intl";

import { Main } from "@/features/page/PageLayout";

/** Page of the catch-all route (PLAN § 3.2, annexe F), under the header of the root. */
export function NotFoundPage() {
  return (
    <Main busy={false}>
      <h2>
        <FormattedMessage
          id="common.notFound.title"
          defaultMessage="Page introuvable"
          description="PLAN annexe F — titre de la route attrape-tout"
        />
      </h2>
      <p>
        <Link to="/">
          <FormattedMessage
            id="common.notFound.home"
            defaultMessage="Revenir à l'accueil"
            description="PLAN annexe F — lien de la route attrape-tout vers la page publique"
          />
        </Link>
      </p>
    </Main>
  );
}
