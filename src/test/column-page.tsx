import { createMemoryHistory, createRootRoute, createRouter } from "@tanstack/react-router";
import type { AnyRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { expect } from "vitest";
import { render } from "vitest-browser-react";

import { useClock } from "@/background/clock";
import type { Restaurant } from "@/domain/types";
import { BookingColumnsProvider } from "@/features/booking/BookingColumnsProvider";
import { ColumnSummary } from "@/features/booking/BookingSummary";
import { DayDetail } from "@/features/calendar/DayCard";
import { RestaurantCalendar } from "@/features/calendar/RestaurantCalendar";
import { createQueryClient } from "@/queries/client";
import { TEST_NOW } from "@/test/clock";
import { TestProviders } from "@/test/providers";
import { StoryRoot, StoryRouter } from "@/test/StoryRouter";
import { TestToaster } from "@/test/TestToaster";

import "@/styles/tokens.css";
import "@/styles/base.css";

// One public column (calendar, summary, day card with its form) in a memory router, on the fake script of the test.
// `renderRoute` renders the HTML shell of __root.tsx, whose <html> and <body> React 19 attaches to the test page's
// own: once an <input> has the focus there, the test page stops responding (forms of P4 (c), journal p4c). The
// route's `validateSearch` and middlewares are left out: search params are read as written.

/** The column of `restaurant` at `url`, its card holding `card`; resolves once the calendar is there. */
export async function renderColumn(url: string, restaurant: Restaurant, card: ReactNode) {
  useClock.setState({ now: TEST_NOW });
  const router: AnyRouter = createRouter({
    routeTree: createRootRoute({ component: StoryRoot }),
    history: createMemoryHistory({ initialEntries: [url] }),
  });
  const queryClient = createQueryClient();
  const screen = await render(
    <TestProviders queryClient={queryClient} accent={restaurant}>
      <StoryRouter router={router}>
        <BookingColumnsProvider>
          <section>
            <RestaurantCalendar restaurant={restaurant} />
            <DayDetail restaurant={restaurant}>
              <ColumnSummary restaurant={restaurant} />
              {card}
            </DayDetail>
          </section>
          <TestToaster />
        </BookingColumnsProvider>
      </StoryRouter>
    </TestProviders>,
  );
  await expect.element(screen.getByRole("grid")).toBeVisible();
  return { screen, router, queryClient };
}
