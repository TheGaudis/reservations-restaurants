import { Skeleton } from "@/ui/feedback/Skeleton";

import preview from "../../../.storybook/preview";

// Calendar skeleton of a column (v1-final:index.html #cal-r1): header row, period label, week, card.
function CalendarSkeleton({ still }: { still: boolean }) {
  return (
    <div aria-busy="true" style={{ display: "grid", gap: "var(--space-4)", maxWidth: "28rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <Skeleton shape="circle" still={still} />
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <Skeleton width="40%" still={still} />
        </div>
        <Skeleton shape="circle" still={still} />
      </div>
      <Skeleton shape="title" width="55%" still={still} />
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "var(--space-1)" }}
      >
        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
          <Skeleton key={day} shape="cell" still={still} />
        ))}
      </div>
      <Skeleton shape="card" still={still} />
    </div>
  );
}

const meta = preview.meta({ component: CalendarSkeleton, args: { still: false } });

export const Loading = meta.story();

/** Load failure: the shimmer stops (08 § 4.16). */
export const Still = meta.story({ args: { still: true } });
