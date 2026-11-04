import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  ScriptOnce,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import { earlyFetchScript } from "@/api/early-fetch";
import type { useSessionStore } from "@/session/session";

import baseCss from "@/styles/base.css?url";

interface RouterContext {
  queryClient: QueryClient;
  session: typeof useSessionStore;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#FFFFFF" },
      { title: "Réservations — Restaurants pédagogiques" },
    ],
    links: [
      { rel: "stylesheet", href: baseCss },
      { rel: "preconnect", href: "https://script.google.com", crossOrigin: "anonymous" },
      { rel: "preconnect", href: "https://script.googleusercontent.com", crossOrigin: "anonymous" },
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
        <Scripts />
      </body>
    </html>
  );
}
