import * as v from "valibot";

import {
  ApiDayR1,
  ApiDayR2,
  ApiSettings,
  DishSchema,
  IsoDateCell,
  NumberCell,
  OptionalNumberCell,
  ServiceModeCell,
  TextCell,
  toDayR1,
  toDayR2,
  toSettings,
} from "@/api/schemas";
import { sumBy } from "@/domain/capacity";
import type {
  BookingR1,
  BookingR2,
  FullState,
  PortionTotal,
  SeatTotal,
  StaffServiceDayR1,
  StaffServiceDayR2,
} from "@/domain/types";

// API boundary (PLAN § 3.3.6), full state of the staff mode (02 § 4.3): the same rules as schemas.ts, plus the
// personal data that only the staff mode reads. Every column may be missing from an old sheet (01 § 1).

/**
 * R1 day of the full state, with `OuvertPar` (01 § 2.2).
 * @internal exported for its tests only (knip --production)
 */
export const StaffServiceDayR1Schema = v.pipe(
  v.object({ ...ApiDayR1.entries, OuvertPar: TextCell }),
  v.transform((day): StaffServiceDayR1 => ({ ...toDayR1(day), openedBy: day.OuvertPar })),
);

/**
 * R2 day of the full state, with `OuvertPar` (01 § 2.4).
 * @internal exported for its tests only (knip --production)
 */
export const StaffServiceDayR2Schema = v.pipe(
  v.object({ ...ApiDayR2.entries, OuvertPar: TextCell }),
  v.transform((day): StaffServiceDayR2 => ({ ...toDayR2(day), openedBy: day.OuvertPar })),
);

/**
 * R1 booking of the full state (01 § 2.3): counters and total empty on bookings made before the prices.
 * @internal exported for its tests only (knip --production)
 */
export const BookingR1Schema = v.pipe(
  v.object({
    ID: v.string(),
    Date: IsoDateCell,
    Nom: TextCell,
    Classe: TextCell,
    Contact: TextCell,
    Qte: NumberCell,
    NbEleve: OptionalNumberCell,
    NbProf: OptionalNumberCell,
    NbExt: OptionalNumberCell,
    PrixTotal: OptionalNumberCell,
    Observation: TextCell,
    Timestamp: TextCell,
  }),
  v.transform((booking): BookingR1 => ({
    id: booking.ID,
    date: booking.Date,
    name: booking.Nom,
    className: booking.Classe,
    contact: booking.Contact,
    seats: booking.Qte,
    students: booking.NbEleve,
    staffMembers: booking.NbProf,
    externals: booking.NbExt,
    total: booking.PrixTotal,
    observation: booking.Observation,
    timestamp: booking.Timestamp,
  })),
);

/**
 * R2 booking line of the full state, one per dish of an order (01 § 2.6).
 * @internal exported for its tests only (knip --production)
 */
export const BookingR2Schema = v.pipe(
  v.object({
    ID: v.string(),
    ItemID: v.string(),
    Date: IsoDateCell,
    Nom: TextCell,
    Classe: TextCell,
    Contact: TextCell,
    Qte: NumberCell,
    Mode: ServiceModeCell,
    Observation: TextCell,
    Timestamp: TextCell,
  }),
  v.transform((booking): BookingR2 => ({
    id: booking.ID,
    dishId: booking.ItemID,
    date: booking.Date,
    name: booking.Nom,
    className: booking.Classe,
    contact: booking.Contact,
    portions: booking.Qte,
    serviceMode: booking.Mode,
    observation: booking.Observation,
    timestamp: booking.Timestamp,
  })),
);

/** Seats per date, in order of first appearance, like the public aggregate of Code.gs (01 § 2.3). */
function seatTotals(bookings: readonly BookingR1[]): SeatTotal[] {
  const seats = sumBy(
    bookings,
    (booking) => booking.date,
    (booking) => booking.seats,
  );
  return [...seats].map(([date, count]) => ({ date, seats: count }));
}

/** Portions per dish, in order of first appearance, like the public aggregate of Code.gs (01 § 2.6). */
function portionTotals(bookings: readonly BookingR2[]): PortionTotal[] {
  const portions = sumBy(
    bookings,
    (booking) => booking.dishId,
    (booking) => booking.portions,
  );
  return [...portions].map(([dishId, count]) => ({ dishId, portions: count }));
}

/**
 * Full state of the staff mode (02 § 4.3), without etag. `r1Booked` and `r2Booked` are summed here, so that
 * domain/capacity.ts reads the same totals on every state (PLAN § 3.3.6).
 */
export const FullStateSchema = v.pipe(
  v.object({
    ...ApiSettings.entries,
    r1Days: v.array(StaffServiceDayR1Schema),
    r1Bookings: v.array(BookingR1Schema),
    r2Days: v.array(StaffServiceDayR2Schema),
    r2Items: v.array(DishSchema),
    r2Bookings: v.array(BookingR2Schema),
  }),
  v.transform((raw): FullState => ({
    settings: toSettings(raw),
    r1Days: raw.r1Days,
    r1Bookings: raw.r1Bookings,
    r2Days: raw.r2Days,
    dishes: raw.r2Items,
    r2Bookings: raw.r2Bookings,
    r1Booked: seatTotals(raw.r1Bookings),
    r2Booked: portionTotals(raw.r2Bookings),
  })),
);
