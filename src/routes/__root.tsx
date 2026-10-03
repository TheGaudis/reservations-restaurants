import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  ScriptOnce,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type { ReactNode } from "react";
import { defineMessages } from "react-intl";

import { earlyFetchScript } from "@/api/early-fetch";
import { intl } from "@/intl/intl";

import baseCss from "@/styles/base.css?url";
import printCss from "@/styles/print.css?url";
import tokensCss from "@/styles/tokens.css?url";

interface RouterContext {
  queryClient: QueryClient;
}

const messages = defineMessages({
  title: {
    id: "common.document.title",
    defaultMessage: "Réservations — Restaurants pédagogiques",
    description: "03 § 2.1 — <title> de la page",
  },
  description: {
    id: "common.document.description",
    defaultMessage:
      "Réservation des repas aux restaurants pédagogiques du Lycée professionnel Aristide Briand.",
    description: "03 § 2.1 — meta description",
  },
});

// Favicon of legacy/index.html (03 § 2.1).
const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23fff'/%3E%3Cpath d='M38 6h9L31 34h-9z' fill='%23A9C23F'/%3E%3Cpath d='M42 14h7L27 50H16z' fill='%231F4E9E'/%3E%3Cpath d='M12 44l40-15 4 7-40 15z' fill='%23A3237F'/%3E%3Cpath d='M41 36h7l8 16h-7z' fill='%23A9C23F'/%3E%3C/svg%3E";

// The root runs in Node when the shell is prerendered: no loader, no beforeLoad, nothing that depends on the URL
// or on the browser (R-01, R-02).
export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0, viewport-fit=cover" },
      { name: "theme-color", content: "#FFFFFF" },
      { name: "description", content: intl.formatMessage(messages.description) },
      { title: intl.formatMessage(messages.title) },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: FAVICON },
      // The script redirects to script.googleusercontent.com; CORS fetches need crossOrigin (R-12).
      { rel: "preconnect", href: "https://script.google.com", crossOrigin: "anonymous" },
      { rel: "preconnect", href: "https://script.googleusercontent.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: tokensCss },
      { rel: "stylesheet", href: baseCss },
      { rel: "stylesheet", href: printCss },
    ],
  }),
  shellComponent: RootDocument,
  component: Outlet,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <ScriptOnce>{earlyFetchScript}</ScriptOnce>
        <HeadContent />
      </head>
      <body>
        {children}
        {/* Both render nothing in a production build (PLAN § 2). */}
        <TanStackRouterDevtools />
        <ReactQueryDevtools />
        <Scripts />
      </body>
    </html>
  );
}
