import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { USE_MOCK_API } from "@/config";
import { getRouter } from "@/router";

// Entry of index.html. React replaces the static skeleton of #root on its first render: nothing is hydrated.
// `pnpm dev` runs on the fake script. The literal DEV test lets the build drop msw: the bundler does not fold
// USE_MOCK_API, an imported constant.
if (import.meta.env.DEV && USE_MOCK_API) {
  const { startDevWorker } = await import("@/mocks/browser");
  await startDevWorker();
}

const container = document.getElementById("root");
if (container === null) throw new Error("index.html has no #root");

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={getRouter()} />
  </StrictMode>,
);
