import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import type { AnyRouter } from "@tanstack/react-router";
import { createContext, Suspense, use } from "react";
import type { ComponentType, ReactNode } from "react";

import { useClock } from "@/background/clock";
import { TEST_NOW } from "@/test/clock";

// Components that read or write the URL (calendars, day cards, mode switch) in stories and tests: a memory router at
// a given URL whose root renders the component, and the clock of the site at TEST_NOW, the date the fake script's
// seed is built from (parite.md § 2).

const StoryContent = createContext<ReactNode>(null);

/** Root component of the memory router: the content, once the first read of the fake script answered. */
function StoryRoot() {
  return <Suspense fallback={null}>{use(StoryContent)}</Suspense>;
}

/**
 * Memory router at `url` (path and search params, e.g. `/?r1=2026-10-06`). The paths / and /collegue exist and render
 * nothing: the mode switch reads the search params of /. The route's `validateSearch` and middlewares are left out:
 * search params are read as written.
 */
export function storyRouter(url: string): AnyRouter {
  const root = createRootRoute({ component: StoryRoot });
  const pages = ["/", "/collegue"].map((path) =>
    createRoute({ getParentRoute: () => root, path, component: () => null }),
  );
  return createRouter({
    routeTree: root.addChildren(pages),
    history: createMemoryHistory({ initialEntries: [url] }),
  });
}

interface StoryRouterProps {
  router: AnyRouter;
  children: ReactNode;
}

/** `router` (built by `storyRouter`) showing `children`. */
export function StoryRouter({ router, children }: StoryRouterProps) {
  return (
    <StoryContent value={children}>
      <RouterProvider router={router} />
    </StoryContent>
  );
}

/** Decorator: the story in a memory router at `url` (`storyRouter`). */
export function atUrl(url: string) {
  const router = storyRouter(url);
  return (Story: ComponentType) => (
    <StoryRouter router={router}>
      <Story />
    </StoryRouter>
  );
}

/**
 * `beforeEach` of a story: the site's clock at `now` (TEST_NOW by default), put back afterwards. `Date.now()` starts
 * from `now` too and runs on: event handlers read it again (R2 cut-off on sending, 04 § 5.3), and the real date must
 * not decide whether a story passes.
 */
export function clockAt(now: number = TEST_NOW): () => () => void {
  return () => {
    const previous = useClock.getState();
    const realNow = Date.now;
    const offset = now - realNow();
    Date.now = () => realNow() + offset;
    useClock.setState({ now });
    return () => {
      Date.now = realNow;
      useClock.setState(previous, true);
    };
  };
}
