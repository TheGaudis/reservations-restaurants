import type {
  BookingR1,
  BookingR2,
  Dish,
  FullState,
  PublicState,
  ServiceDayR1,
  Settings,
  StaffServiceDayR1,
  StaffServiceDayR2,
} from "@/domain/types";

// Builders of domain states for tests, in the English model (PLAN § 3.3.6). Values of parite.md § 2.

export const SETTINGS: Settings = {
  name1: "Restaurant Pédagogique",
  name2: "Aristide",
  desc1: "Table réservée par nombre de couverts, avec le menu du jour.",
  desc2: "Plats à emporter ou sur place, chacun avec son propre stock.",
  cancellationContact: "le secrétariat",
  priceStudent: 4.95,
  priceStaff: 6.1,
  priceExternal: 9.9,
};

export function publicState(overrides: Partial<PublicState> = {}): PublicState {
  return {
    etag: "E1",
    settings: SETTINGS,
    r1Days: [],
    r1Booked: [],
    r2Days: [],
    dishes: [],
    r2Booked: [],
    ...overrides,
  };
}

export function fullState(overrides: Partial<FullState> = {}): FullState {
  return {
    settings: SETTINGS,
    r1Days: [],
    r1Bookings: [],
    r2Days: [],
    dishes: [],
    r2Bookings: [],
    r1Booked: [],
    r2Booked: [],
    ...overrides,
  };
}

export function dayR1(
  date: string,
  capacity: number,
  overrides: Partial<ServiceDayR1> = {},
): ServiceDayR1 {
  return { date, capacity, menu: "", theme: "", ...overrides };
}

export function staffDayR1(date: string, capacity: number, openedBy = ""): StaffServiceDayR1 {
  return { ...dayR1(date, capacity), openedBy };
}

export function staffDayR2(date: string, openedBy = ""): StaffServiceDayR2 {
  return { date, note: "", theme: "", openedBy };
}

export function dish(id: string, date: string, overrides: Partial<Dish> = {}): Dish {
  return { id, date, name: id, stock: 10, price: null, voucher: false, ...overrides };
}

export function bookingR1(id: string, date: string, overrides: Partial<BookingR1> = {}): BookingR1 {
  return {
    id,
    date,
    name: id,
    className: "TS2",
    contact: "",
    seats: 1,
    students: 1,
    staffMembers: 0,
    externals: 0,
    total: 4.95,
    observation: "",
    timestamp: "2026-10-01",
    ...overrides,
  };
}

export function bookingR2(
  id: string,
  dishId: string,
  overrides: Partial<BookingR2> = {},
): BookingR2 {
  return {
    id,
    dishId,
    date: "2026-10-06",
    name: id,
    className: "TS2",
    contact: "",
    portions: 1,
    serviceMode: "takeaway",
    observation: "",
    timestamp: "2026-10-01",
    ...overrides,
  };
}
