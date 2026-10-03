import * as v from "valibot";

import type {
  AdjustedDish,
  BookingResult,
  ConfirmedDish,
  Dish,
  EmailStatus,
  PortionTotal,
  PublicState,
  SeatTotal,
  ServiceDayR1,
  ServiceDayR2,
  ServiceMode,
  Settings,
  SkippedDish,
  WriteResponse,
} from "@/domain/types";
import { hasVoucherMark, plainName } from "@/domain/vouchers";

// API boundary (PLAN § 3.3.6), public answers: each schema checks the exact shape answered by Code.gs (01 § 1,
// 02 § 3.2, § 4.4, § 4.5), then translates it into the hand-written model of domain/types.ts. Unknown keys are
// dropped (`v.object`). The transformations are idempotent: the local copy goes through `DishSchema` again
// (03 § 1.1). The full state of the staff mode lives in staff-schemas.ts.

/** `YYYY-MM-DD`: Sheets date cells come back in this form (01 § 1). */
export const IsoDateCell = v.pipe(v.string(), v.isoDate());

/** Number cell: a JSON number or a numeric string such as `'4.95'` (01 § 1, "Types côté client"). */
export const NumberCell = v.pipe(
  v.union([v.number(), v.pipe(v.string(), v.trim(), v.nonEmpty())]),
  v.transform(Number),
  v.finite(),
);

/** Number cell that may be empty: `""` means "no value" and becomes null, never 0 (01 § 2.3, § 2.5). */
export const OptionalNumberCell = v.pipe(
  v.optional(v.union([NumberCell, v.literal("")]), ""),
  v.transform((cell) => (cell === "" ? null : cell)),
);

/** Free text; an empty cell is `""`, and so is a column missing from the full state (01 § 1). */
export const TextCell = v.optional(v.string(), "");

/** `Mode` of an R2 booking (01 § 2.6): `'emporter'` is takeaway, any other value dine-in (07 § 4.1). */
export const ServiceModeCell = v.pipe(
  TextCell,
  v.transform((mode): ServiceMode => (mode === "emporter" ? "takeaway" : "dineIn")),
);

/** Settings, flat at the root of a state (01 § 2.1) or under `config` in the local copy (03 § 1.1). */
export const ApiSettings = v.object({
  name1: v.string(),
  name2: v.string(),
  desc1: v.string(),
  desc2: v.string(),
  contactAnnulation: v.string(),
  priceEleve: NumberCell,
  priceProf: NumberCell,
  priceExterieur: NumberCell,
});

export function toSettings(raw: v.InferOutput<typeof ApiSettings>): Settings {
  return {
    name1: raw.name1,
    name2: raw.name2,
    desc1: raw.desc1,
    desc2: raw.desc2,
    cancellationContact: raw.contactAnnulation,
    priceStudent: raw.priceEleve,
    priceStaff: raw.priceProf,
    priceExternal: raw.priceExterieur,
  };
}

export const SettingsSchema = v.pipe(ApiSettings, v.transform(toSettings));

/** R1 day (01 § 2.2); the full state adds `OuvertPar` (staff-schemas.ts). */
export const ApiDayR1 = v.object({
  Date: IsoDateCell,
  Capacite: NumberCell,
  Menu: TextCell,
  Theme: TextCell,
});
type ApiDayR1 = v.InferOutput<typeof ApiDayR1>;

export function toDayR1(day: ApiDayR1): ServiceDayR1 {
  return { date: day.Date, capacity: day.Capacite, menu: day.Menu, theme: day.Theme };
}

export const ServiceDayR1Schema = v.pipe(ApiDayR1, v.transform(toDayR1));

/** R2 day (01 § 2.4); the full state adds `OuvertPar` (staff-schemas.ts). */
export const ApiDayR2 = v.object({ Date: IsoDateCell, Note: TextCell, Theme: TextCell });
type ApiDayR2 = v.InferOutput<typeof ApiDayR2>;

export function toDayR2(day: ApiDayR2): ServiceDayR2 {
  return { date: day.Date, note: day.Note, theme: day.Theme };
}

export const ServiceDayR2Schema = v.pipe(ApiDayR2, v.transform(toDayR2));

/**
 * R2 dish (01 § 2.5, § 3.5): the voucher mark leaves the name and sets `voucher`; `Ticket` exists only in the
 * local copy, whose names are already plain.
 */
export const DishSchema = v.pipe(
  v.object({
    ID: v.string(),
    Date: IsoDateCell,
    Nom: v.string(),
    Stock: NumberCell,
    Prix: OptionalNumberCell,
    Ticket: v.optional(v.boolean()),
  }),
  v.transform((dish): Dish => ({
    id: dish.ID,
    date: dish.Date,
    name: plainName(dish.Nom),
    stock: dish.Stock,
    price: dish.Prix,
    voucher: dish.Ticket === true || hasVoucherMark(dish.Nom),
  })),
);

/** Public aggregates: seats per date (01 § 2.3), portions per dish (01 § 2.6). */
export const SeatTotalSchema = v.pipe(
  v.object({ Date: IsoDateCell, Qte: NumberCell }),
  v.transform((total): SeatTotal => ({ date: total.Date, seats: total.Qte })),
);

export const PortionTotalSchema = v.pipe(
  v.object({ ItemID: v.string(), Qte: NumberCell }),
  v.transform((total): PortionTotal => ({ dishId: total.ItemID, portions: total.Qte })),
);

const ApiPublicState = v.object({
  ...ApiSettings.entries,
  etag: v.string(),
  r1Days: v.array(ServiceDayR1Schema),
  r1Bookings: v.array(SeatTotalSchema),
  r2Days: v.array(ServiceDayR2Schema),
  r2Items: v.array(DishSchema),
  r2Bookings: v.array(PortionTotalSchema),
});

function toPublicState(raw: v.InferOutput<typeof ApiPublicState>): PublicState {
  return {
    etag: raw.etag,
    settings: toSettings(raw),
    r1Days: raw.r1Days,
    r1Booked: raw.r1Bookings,
    r2Days: raw.r2Days,
    dishes: raw.r2Items,
    r2Booked: raw.r2Bookings,
  };
}

/** Public state (02 § 3.2): no personal data, bookings already summed by the script. */
export const PublicStateSchema = v.pipe(ApiPublicState, v.transform(toPublicState));

/** Answer of a public read: a new state, or `unchanged` when `since` is the current etag (02 § 3.3, § 5.1). */
export type ReadResponse =
  | { type: "state"; state: PublicState }
  | { type: "unchanged"; etag: string };

export const ReadResponseSchema = v.union([
  v.pipe(
    v.object({ unchanged: v.literal(true), etag: v.string() }),
    v.transform(({ etag }): ReadResponse => ({ type: "unchanged", etag })),
  ),
  v.pipe(
    PublicStateSchema,
    v.transform((state): ReadResponse => ({ type: "state", state })),
  ),
]);

/** `_emailStatus` (02 § 4.4): `{ sent: true }`, or `{ sent: false, reason }`, reason `'no-email'` or MailApp's. */
export const EmailStatusSchema = v.pipe(
  v.object({ sent: v.boolean(), reason: v.optional(v.string()) }),
  v.transform((status): EmailStatus => ({ sent: status.sent, reason: status.reason ?? null })),
);

const ConfirmedDishSchema = v.pipe(
  v.object({ itemId: v.string(), nom: v.string(), qte: NumberCell, prix: OptionalNumberCell }),
  v.transform((dish): ConfirmedDish => ({
    dishId: dish.itemId,
    name: plainName(dish.nom),
    portions: dish.qte,
    price: dish.prix,
    voucher: hasVoucherMark(dish.nom),
  })),
);

const AdjustedDishSchema = v.pipe(
  v.object({ nom: v.string(), demande: NumberCell, accorde: NumberCell }),
  v.transform((dish): AdjustedDish => ({
    name: plainName(dish.nom),
    requested: dish.demande,
    granted: dish.accorde,
  })),
);

const SkippedDishSchema = v.pipe(
  v.object({ nom: v.string() }),
  v.transform((dish): SkippedDish => ({ name: plainName(dish.nom) })),
);

/** `_bookingResult` (02 § 4.5): names without the voucher mark; `totalPrix` and `hasPriceGap` are dropped. */
export const BookingResultSchema = v.pipe(
  v.object({
    confirmed: v.array(ConfirmedDishSchema),
    adjusted: v.array(AdjustedDishSchema),
    skipped: v.array(SkippedDishSchema),
  }),
  v.transform((result): BookingResult => result),
);

/**
 * Answer of `addBookingR1` and `addBookingR2Multi` (02 § 4.4, § 4.5, § 5.4): the `_…` fields move beside the
 * public state, so that only `state` reaches the query cache and the local copy.
 */
export const WriteResponseSchema = v.pipe(
  v.object({
    ...ApiPublicState.entries,
    _duplicate: v.optional(v.boolean(), false),
    _emailStatus: v.optional(v.nullable(EmailStatusSchema), null),
    _bookingResult: v.optional(BookingResultSchema),
  }),
  v.transform(({ _duplicate, _emailStatus, _bookingResult, ...raw }): WriteResponse => ({
    state: toPublicState(raw),
    duplicate: _duplicate,
    emailStatus: _emailStatus,
    bookingResult: _bookingResult ?? null,
  })),
);
