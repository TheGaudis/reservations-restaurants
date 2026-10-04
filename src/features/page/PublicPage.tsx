import { Page } from "@/features/page/Page";

/**
 * Public page (G-01 to G-05, P-*): the calendars and day cards of P4 (b) go into the slots of `Page`, which renders
 * exactly `PageSkeleton` while React hydrates (arbitrage 16).
 */
export function PublicPage() {
  return <Page />;
}
