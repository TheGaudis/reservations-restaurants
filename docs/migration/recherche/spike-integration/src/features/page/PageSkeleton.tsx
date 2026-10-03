import { FormattedMessage } from "react-intl";

export function PageSkeleton() {
  return (
    <main data-testid="skeleton" aria-busy="true">
      <h1>
        <FormattedMessage
          id="loading.title"
          defaultMessage="Chargement…"
          description="03 § 3 — squelette"
        />
      </h1>
    </main>
  );
}
