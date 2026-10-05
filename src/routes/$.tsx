import { createFileRoute } from "@tanstack/react-router";

import { NotFoundPage } from "@/features/page/NotFoundPage";

// Catch-all: an unknown path shows "Page introuvable" (PLAN § 3.2); it also limits issue #8473 (R-01).
export const Route = createFileRoute("/$")({
  component: NotFoundPage,
});
