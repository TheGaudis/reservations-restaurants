import { StartClient } from "@tanstack/react-start/client";
import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";

import { USE_MOCK_API } from "@/config";
import { logCaughtError } from "@/queries/first-read";

// Start's client entry. No onRecoverableError: a hydration error must stay visible (PLAN arbitrage 16). onCaughtError
// leaves out of the console only the failed first read, which the page shows (G-03).
// `pnpm dev` runs on the fake script. The literal DEV test lets the build drop msw: the bundler does not fold
// USE_MOCK_API, an imported constant.
if (import.meta.env.DEV && USE_MOCK_API) {
  const { startDevWorker } = await import("@/mocks/browser");
  await startDevWorker();
}

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
    { onCaughtError: logCaughtError },
  );
});
