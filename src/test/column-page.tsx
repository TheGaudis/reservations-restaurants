import { useRef } from "react";
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
import { storyRouter, StoryRouter } from "@/test/story-router";
import { Toaster } from "@/ui/feedback/Toaster";

import "@/styles/tokens.css";
import "@/styles/base.css";

// One public column (calendar, summary, day card with its form) in a memory router (`storyRouter`), on the fake
// script of the test.

/** Toasts of a test, in an element of their own as in __root.tsx (`container`, journal p4a decision 7). */
function TestToaster() {
  const container = useRef<HTMLDivElement>(null);
  return (
    <>
      <div ref={container} />
      <Toaster container={container} />
    </>
  );
}

/** The column of `restaurant` at `url`, its card holding `card`; resolves once the calendar is there. */
export async function renderColumn(url: string, restaurant: Restaurant, card: ReactNode) {
  useClock.setState({ now: TEST_NOW });
  const router = storyRouter(url);
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
