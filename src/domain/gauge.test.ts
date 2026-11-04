import { expect, it } from "vitest";

import { gaugePercent } from "@/domain/gauge";

it.each([
  [12, 20, 60],
  [20, 20, 100],
  [0, 20, 0],
  [-2, 5, 0],
  [25, 20, 100],
  [1, 3, 33.3],
  [2, 3, 66.7],
  [5, 0, 0],
  [3, -1, 0],
])("%i left of %i fills %d % of the gauge (00 § 3)", (remaining, capacity, percent) => {
  expect(gaugePercent(remaining, capacity)).toBe(percent);
});
