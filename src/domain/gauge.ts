// Fill of the capacity gauge (`gaugeStyle`, 00 § 3, 05 § 4.5); the CSS variable `--pct` is written by `ui/`.

/** Share of the seats or portions still free, in percent, clamped to 0 to 100, one decimal; 0 without capacity. */
export function gaugePercent(remaining: number, capacity: number): number {
  if (capacity <= 0) return 0;
  const percent = Math.max(0, Math.min(100, (remaining / capacity) * 100));
  return Math.round(percent * 10) / 10;
}
