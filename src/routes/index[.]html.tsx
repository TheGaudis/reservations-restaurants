import { createFileRoute, redirect } from "@tanstack/react-router";

// Bookmarks of the legacy site point to …/index.html (PLAN § 3.2).
export const Route = createFileRoute("/index.html")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});
