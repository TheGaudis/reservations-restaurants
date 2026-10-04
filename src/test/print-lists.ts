import type { BookingR1, StaffServiceDayR1 } from "@/domain/types";
import { bookingR1, staffDayR1 } from "@/test/domain-states";

// R1 day of the printed documents in tests and stories: Tuesday 6 October 2026 of the seed (parite.md § 2), with
// Cyrille Ungerer, Léa Martin, then Jean Petit, booked before the prices. English model only (api-boundary.test.ts).

export const DAY = "2026-10-06";

export const UNGERER = bookingR1("ungerer", DAY, {
  name: "Cyrille Ungerer",
  className: "TS2",
  contact: "c.ungerer@exemple.fr",
  seats: 3,
  students: 2,
  staffMembers: 1,
  externals: 0,
  total: 16,
  observation: "Table près de la fenêtre",
});
export const MARTIN = bookingR1("martin", DAY, {
  name: "Léa Martin",
  className: "BTS1",
  contact: "06 12 34 56 78",
  seats: 8,
  students: 0,
  staffMembers: 0,
  externals: 8,
  total: 79.2,
});
export const PETIT = bookingR1("petit", DAY, {
  name: "Jean Petit",
  className: "Personnel",
  contact: "j.petit@exemple.fr",
  seats: 4,
  students: null,
  staffMembers: null,
  externals: null,
  total: null,
});

export function seedDayR1(overrides: Partial<StaffServiceDayR1> = {}): StaffServiceDayR1 {
  return {
    ...staffDayR1(DAY, 20, "M. Dupont"),
    menu: "Velouté de potiron, blanquette, tarte Tatin",
    ...overrides,
  };
}

/** `count` more bookings after the seed's, for a list longer than one page (07 § 2.4). */
export function longBookingsR1(count: number): BookingR1[] {
  return Array.from({ length: count }, (_, index) =>
    bookingR1(`guest-${index + 1}`, DAY, {
      name: `Invité ${index + 1}`,
      className: index % 2 === 0 ? "Extérieurs" : "Personnel",
      contact: `invite${index + 1}@exemple.fr`,
      seats: 2,
      students: 0,
      staffMembers: index % 2 === 0 ? 0 : 2,
      externals: index % 2 === 0 ? 2 : 0,
      total: index % 2 === 0 ? 19.8 : 12.2,
    }),
  );
}
