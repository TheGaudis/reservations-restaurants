import { createMemoryHistory, createRootRoute, createRouter } from "@tanstack/react-router";
import type { ComponentType } from "react";

import { useClock } from "@/background/clock";
import { TEST_NOW } from "@/test/clock";
import { StoryRoot, StoryRouter } from "@/test/StoryRouter";

// Stories of the components that read or write the URL (calendars, day cards): a memory router at a given URL, and
// the clock of the site at TEST_NOW, the date the fake script's seed is built from (parite.md § 2).

/** Decorator: the story in a memory router at `url` (path and search params, e.g. `/?r1=2026-10-06`). */
export function atUrl(url: string) {
  const router = createRouter({
    routeTree: createRootRoute({ component: StoryRoot }),
    history: createMemoryHistory({ initialEntries: [url] }),
  });
  return (Story: ComponentType) => (
    <StoryRouter router={router}>
      <Story />
    </StoryRouter>
  );
}

/** `beforeEach` of a story: the site's clock at `now` (TEST_NOW by default), put back afterwards. */
export function clockAt(now: number = TEST_NOW): () => () => void {
  return () => {
    const previous = useClock.getState();
    useClock.setState({ now });
    return () => {
      useClock.setState(previous, true);
    };
  };
}
