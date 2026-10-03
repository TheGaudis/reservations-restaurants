import { createFileRoute } from "@tanstack/react-router";
import { FormattedMessage } from "react-intl";

export const Route = createFileRoute("/$")({
  component: NotFound,
});

function NotFound() {
  return (
    <p>
      <FormattedMessage
        id="common.notFound"
        defaultMessage="Page introuvable"
        description="route attrape-tout"
      />
    </p>
  );
}
