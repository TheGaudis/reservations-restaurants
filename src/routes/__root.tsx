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
import { useRef } from "react";
import type { ReactNode } from "react";
import { defineMessages } from "react-intl";

import { earlyFetchScript } from "@/api/early-fetch";
import { BrowserOnly } from "@/features/page/BrowserOnly";
import { Header, HeaderMode } from "@/features/page/Header";
import { ModeSwitch } from "@/features/page/ModeSwitch";
import { PageLayout } from "@/features/page/PageLayout";
import { ShellSkeleton } from "@/features/page/PageSkeleton";
import { intl } from "@/intl/intl";
import { AutoRefresh } from "@/queries/AutoRefresh";
import type { SessionStore } from "@/session/session";
import { Toaster } from "@/ui/feedback/Toaster";

import baseCss from "@/styles/base.css?url";
import printCss from "@/styles/print.css?url";
import tokensCss from "@/styles/tokens.css?url";

interface RouterContext {
  queryClient: QueryClient;
  /** Staff session store (PLAN § 3.4): the /collegue guard reads it, tests pass a fresh one. */
  session: SessionStore;
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
  component: AppRoot,
});

// Frame of every page (08 § 7.1), mounted once: the pending, error and content states of a route, and the move from /
// to /collegue, change only what `<Outlet />` renders. The header, the logo and « Client / Collègue » stay the same
// elements (03 § 2.3, § 5.4); `AutoRefresh` is the only refresh, for every route (PLAN § 3.3.2). What reads the
// browser renders in `BrowserOnly`: the shell holds the header without the switch, and the skeleton of both columns.
// `.app-root` is the stacking context of the app: Base UI portals, appended to <body>, stay above it (PLAN § 3.6).
// Toasts of every page (G-07), in an element of their own after it: their portal renders nothing in the prerendered
// shell nor while React hydrates. A portal straight into <body> blocks the route tests, where React renders the
// <body> of the shell inside a test container.
function AppRoot() {
  const toasts = useRef<HTMLDivElement>(null);
  return (
    <>
      <div className="app-root">
        <PageLayout>
          <Header>
            <BrowserOnly fallback={null}>
              <HeaderMode>
                <ModeSwitch />
              </HeaderMode>
            </BrowserOnly>
          </Header>
          <BrowserOnly fallback={<ShellSkeleton />}>
            <Outlet />
          </BrowserOnly>
        </PageLayout>
      </div>
      <div ref={toasts} />
      <Toaster container={toasts} />
      <AutoRefresh />
    </>
  );
}

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
