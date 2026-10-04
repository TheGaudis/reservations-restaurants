import { RouterProvider } from "@tanstack/react-router";
import type { AnyRouter } from "@tanstack/react-router";
import { createContext, Suspense, use } from "react";
import type { ReactNode } from "react";

// Memory router of the stories (src/test/story-router.tsx): its only route renders the story.

const StoryContent = createContext<ReactNode>(null);

/** Component of the only route: the story, once the first read of the fake script answered. */
export function StoryRoot() {
  return <Suspense fallback={null}>{use(StoryContent)}</Suspense>;
}

interface StoryRouterProps {
  router: AnyRouter;
  children: ReactNode;
}

/** `router` (built with `StoryRoot` as its root component) showing `children`. */
export function StoryRouter({ router, children }: StoryRouterProps) {
  return (
    <StoryContent value={children}>
      <RouterProvider router={router} />
    </StoryContent>
  );
}
