// Domain model, written by hand: the single source of truth of the data shapes (PLAN § 3.3.6).
// api/schemas.ts validates the script's responses and translates them into these types; the script's
// field names never appear outside the API boundary.

/** Business day, `YYYY-MM-DD`, compared as a string; "today" is the Paris date (PLAN § 3.7, D-12). */
export type IsoDate = string;

/** R1: table service booked by seats; R2: dishes ordered by portions (00 § 1). */
export type Restaurant = "r1" | "r2";

/** R2 only; the API boundary translates the script's values (01 § 3.6). */
export type ServiceMode = "dineIn" | "takeaway";

/** `Config` sheet (01 § 2.1); prices in euros, parsed from strings such as `'4.95'`. */
export interface Settings {
  name1: string;
  name2: string;
  desc1: string;
  desc2: string;
  cancellationContact: string;
  priceStudent: number;
  priceStaff: number;
  priceExternal: number;
}

/** Key of a setting, translated to the script's key by the API boundary. */
export type SettingKey = keyof Settings;

/** R1 service day (01 § 2.2). */
export interface ServiceDayR1 {
  date: IsoDate;
  capacity: number;
  menu: string;
  theme: string;
}

/** R1 service day of the full state: `openedBy` is never public (01 § 2.2). */
export interface StaffServiceDayR1 extends ServiceDayR1 {
  openedBy: string;
}

/** R2 service day (01 § 2.4). */
export interface ServiceDayR2 {
  date: IsoDate;
  note: string;
  theme: string;
}

export interface StaffServiceDayR2 extends ServiceDayR2 {
  openedBy: string;
}

/** R2 dish (01 § 2.5): `name` without the voucher mark, `price` null when the sheet has none (never 0 for ""). */
export interface Dish {
  id: string;
  date: IsoDate;
  name: string;
  stock: number;
  price: number | null;
  voucher: boolean;
}

/** R1 booking, full state only (01 § 2.3). Counters and total are null on bookings made before the prices. */
export interface BookingR1 {
  id: string;
  date: IsoDate;
  name: string;
  className: string;
  contact: string;
  seats: number;
  students: number | null;
  staffMembers: number | null;
  externals: number | null;
  total: number | null;
  observation: string;
  /** Day of the booking: the script truncates the time (01, point 2). */
  timestamp: string;
}

/** R2 booking line, one per dish of an order, full state only (01 § 2.6). */
export interface BookingR2 {
  id: string;
  dishId: string;
  date: IsoDate;
  name: string;
  className: string;
  contact: string;
  portions: number;
  serviceMode: ServiceMode;
  observation: string;
  timestamp: string;
}

/** Seats already booked on a date: public aggregate, or computed from the full state (01 § 2.3). */
export interface SeatTotal {
  date: IsoDate;
  seats: number;
}

/** Portions already booked of a dish: public aggregate, or computed from the full state (01 § 2.6). */
export interface PortionTotal {
  dishId: string;
  portions: number;
}

/** Public state (02 § 3.2) or local copy (03 § 1.1): no personal data. */
export interface PublicState {
  /** Null for a local copy written without etag by the old site after a staff session. */
  etag: string | null;
  settings: Settings;
  r1Days: ServiceDayR1[];
  r1Booked: SeatTotal[];
  r2Days: ServiceDayR2[];
  dishes: Dish[];
  r2Booked: PortionTotal[];
}

/** Full state of the staff mode (02 § 4.3); `r1Booked` and `r2Booked` are computed at the API boundary. */
export interface FullState {
  settings: Settings;
  r1Days: StaffServiceDayR1[];
  r1Bookings: BookingR1[];
  r2Days: StaffServiceDayR2[];
  dishes: Dish[];
  r2Bookings: BookingR2[];
  r1Booked: SeatTotal[];
  r2Booked: PortionTotal[];
}

/** `_emailStatus` (02 § 4.4): `reason` is `'no-email'` or the mail service's error, null when sent. */
export interface EmailStatus {
  sent: boolean;
  reason: string | null;
}

/** Dish written by `addBookingR2Multi`, with the portions granted (02 § 4.5). */
export interface ConfirmedDish {
  dishId: string;
  name: string;
  portions: number;
  price: number | null;
  voucher: boolean;
}

/** Dish granted fewer portions than requested (02 § 4.5). */
export interface AdjustedDish {
  name: string;
  requested: number;
  granted: number;
}

/** Dish not booked at all: sold out or deleted (02 § 4.5). */
export interface SkippedDish {
  name: string;
}

/** `_bookingResult` (02 § 4.5); `totalPrix` and `hasPriceGap` are ignored by the client. */
export interface BookingResult {
  confirmed: ConfirmedDish[];
  adjusted: AdjustedDish[];
  skipped: SkippedDish[];
}

/** Answer of a booking (02 § 5.4): only `state` goes to the query cache. */
export interface WriteResponse {
  state: PublicState;
  duplicate: boolean;
  emailStatus: EmailStatus | null;
  bookingResult: BookingResult | null;
}

/** `addBookingR1`, public form and staff addition (02 § 4.4); texts already trimmed. */
export interface BookingR1Input {
  date: IsoDate;
  name: string;
  contact: string;
  className: string;
  students: number;
  staffMembers: number;
  externals: number;
  observation: string;
  requestId: string;
}

/**
 * One dish of an R2 order (`items` of 02 § 4.5).
 * @internal exported for its tests only (knip --production)
 */
export interface OrderItem {
  dishId: string;
  portions: number;
}

/** `addBookingR2Multi`, public form and staff addition (02 § 4.5); texts already trimmed. */
export interface OrderR2Input {
  date: IsoDate;
  name: string;
  contact: string;
  className: string;
  serviceMode: ServiceMode;
  items: OrderItem[];
  observation: string;
  requestId: string;
}

/**
 * `addDayR1` (02 § 4.7, 06 § 4.1).
 */
export interface OpenDayR1Input {
  date: IsoDate;
  capacity: number;
  menu: string;
  theme: string;
  openedBy: string;
}

/**
 * `editDayR1` (02 § 4.7, 06 § 5.1).
 */
export interface EditDayR1Input {
  date: IsoDate;
  capacity: number;
  menu: string;
  theme: string;
}

/**
 * Dish typed by a colleague (06 § 4.2, § 6.1): the voucher mark and `price: ""` are added at the API boundary.
 */
export interface DishInput {
  name: string;
  stock: number;
  price: number | null;
  voucher: boolean;
}

/**
 * `addDayR2` (02 § 4.7, 06 § 4.2).
 */
export interface OpenDayR2Input {
  date: IsoDate;
  note: string;
  theme: string;
  openedBy: string;
  dishes: DishInput[];
}

/**
 * `addItemR2` (06 § 6.2).
 */
export interface AddDishInput extends DishInput {
  date: IsoDate;
}

/**
 * `editItemR2` (06 § 6.3).
 */
export interface EditDishInput extends DishInput {
  dishId: string;
}

/** `editBookingR1` (02 § 4.7, 06 § 7.3): `seats` and `total` are sent although the script recomputes them. */
export interface EditBookingR1Input {
  id: string;
  name: string;
  contact: string;
  className: string;
  seats: number;
  students: number;
  staffMembers: number;
  externals: number;
  total: number;
  observation: string;
}

/** `editBookingR2` (02 § 4.7, 06 § 7.4). */
export interface EditBookingR2Input {
  id: string;
  name: string;
  contact: string;
  className: string;
  portions: number;
  serviceMode: ServiceMode;
  observation: string;
}

/**
 * `setConfigField` (02 § 4.7): one request per changed setting, value as typed.
 */
export interface SettingInput {
  key: SettingKey;
  value: string;
}
