import { WriteResponseSchema } from "@/api/schemas";
import { FullStateSchema } from "@/api/staff-schemas";
import { parseAnswer, postAction } from "@/api/transport";
import type {
  AddDishInput,
  BookingR1Input,
  DishInput,
  EditBookingR1Input,
  EditBookingR2Input,
  EditDayR1Input,
  EditDishInput,
  FullState,
  IsoDate,
  OpenDayR1Input,
  OpenDayR2Input,
  OrderR2Input,
  ServiceMode,
  SettingInput,
  SettingKey,
  WriteResponse,
} from "@/domain/types";
import { withVoucherMark } from "@/domain/vouchers";

// API boundary (PLAN § 3.3.6), writes: one function per POST action the site sends (02 § 4.4, § 4.5, § 4.7),
// never `addBookingR2` (obsolete, 02 § 4.6) nor `checkPassword`. Each takes the English model and rebuilds the body
// with the script's names, exactly the fields of the old client. A write is sent once: no retry, no timeout
// (R-11).

/**
 * Script key of each setting, sent by `setConfigField` (01 § 2.1, 02 § 4.7).
 * @internal exported for its tests only (knip --production)
 */
export const SETTINGS_API_KEYS: Readonly<Record<SettingKey, string>> = {
  name1: "name1",
  name2: "name2",
  desc1: "desc1",
  desc2: "desc2",
  cancellationContact: "contactAnnulation",
  priceStudent: "priceEleve",
  priceStaff: "priceProf",
  priceExternal: "priceExterieur",
};

/** `mode` of the script (01 § 2.6): `'emporter'` or `'surplace'`. */
function apiServiceMode(mode: ServiceMode): string {
  return mode === "takeaway" ? "emporter" : "surplace";
}

/** Dish as the script stores it (06 § 4.2-4.3, § 6.1): voucher mark in the name, `""` for no price (01 § 2.5). */
function apiDish({ name, stock, price, voucher }: DishInput) {
  return { name: withVoucherMark(name, voucher), stock, price: price ?? "" };
}

async function publicWrite(
  action: string,
  body: Readonly<Record<string, unknown>>,
): Promise<WriteResponse> {
  return parseAnswer(WriteResponseSchema, await postAction(action, body));
}

/** Protected action (02 § 2): the password goes in the body, never in the URL; the answer is the full state. */
async function staffWrite(
  action: string,
  password: string,
  body: Readonly<Record<string, unknown>>,
): Promise<FullState> {
  return parseAnswer(FullStateSchema, await postAction(action, { password, ...body }));
}

/** `addBookingR1` (02 § 4.4): public form and staff addition, without password. */
export async function addBookingR1(input: BookingR1Input): Promise<WriteResponse> {
  const body = {
    date: input.date,
    nom: input.name,
    contact: input.contact,
    classe: input.className,
    nbEleve: input.students,
    nbProf: input.staffMembers,
    nbExt: input.externals,
    observation: input.observation,
    requestId: input.requestId,
  };
  return publicWrite("addBookingR1", body);
}

/** `addBookingR2Multi` (02 § 4.5): public form and staff addition, without password. */
export async function addBookingR2Multi(input: OrderR2Input): Promise<WriteResponse> {
  const body = {
    date: input.date,
    nom: input.name,
    contact: input.contact,
    classe: input.className,
    mode: apiServiceMode(input.serviceMode),
    items: input.items.map((item) => ({ itemId: item.dishId, qte: item.portions })),
    observation: input.observation,
    requestId: input.requestId,
  };
  return publicWrite("addBookingR2Multi", body);
}

/** `addDayR1` (02 § 4.7, 06 § 4.1). */
export async function addDayR1(password: string, input: OpenDayR1Input): Promise<FullState> {
  const body = {
    date: input.date,
    capacity: input.capacity,
    menu: input.menu,
    theme: input.theme,
    collegue: input.openedBy,
  };
  return staffWrite("addDayR1", password, body);
}

/** `editDayR1` (02 § 4.7, 06 § 5.1). */
export async function editDayR1(password: string, input: EditDayR1Input): Promise<FullState> {
  const body = { date: input.date, capacity: input.capacity, menu: input.menu, theme: input.theme };
  return staffWrite("editDayR1", password, body);
}

/** `deleteDayR1` (02 § 4.7, 06 § 5.2): the script also deletes every booking of the day. */
export async function deleteDayR1(password: string, date: IsoDate): Promise<FullState> {
  return staffWrite("deleteDayR1", password, { date });
}

/** `deleteBookingR1` (02 § 4.7, 06 § 7.1). */
export async function deleteBookingR1(password: string, id: string): Promise<FullState> {
  return staffWrite("deleteBookingR1", password, { id });
}

/** `editBookingR1` (02 § 4.7, 06 § 7.3): `qte` and `prixTotal` are sent as the old client did; the script ignores them. */
export async function editBookingR1(
  password: string,
  input: EditBookingR1Input,
): Promise<FullState> {
  const body = {
    id: input.id,
    nom: input.name,
    contact: input.contact,
    classe: input.className,
    qte: input.seats,
    nbEleve: input.students,
    nbProf: input.staffMembers,
    nbExt: input.externals,
    prixTotal: input.total,
    observation: input.observation,
  };
  return staffWrite("editBookingR1", password, body);
}

/** `addDayR2` (02 § 4.7, 06 § 4.2): on an open day, the script adds only the dishes of a new name. */
export async function addDayR2(password: string, input: OpenDayR2Input): Promise<FullState> {
  const body = {
    date: input.date,
    note: input.note,
    items: input.dishes.map(apiDish),
    theme: input.theme,
    collegue: input.openedBy,
  };
  return staffWrite("addDayR2", password, body);
}

/** `addItemR2` (02 § 4.7, 06 § 6.2). */
export async function addItemR2(password: string, input: AddDishInput): Promise<FullState> {
  return staffWrite("addItemR2", password, { date: input.date, ...apiDish(input) });
}

/** `editItemR2` (02 § 4.7, 06 § 6.3). */
export async function editItemR2(password: string, input: EditDishInput): Promise<FullState> {
  return staffWrite("editItemR2", password, { itemId: input.dishId, ...apiDish(input) });
}

/** `deleteItemR2` (02 § 4.7, 06 § 6.4): the bookings of the dish stay. */
export async function deleteItemR2(password: string, dishId: string): Promise<FullState> {
  return staffWrite("deleteItemR2", password, { itemId: dishId });
}

/** `deleteDayR2` (02 § 4.7, 06 § 5.2): the script also deletes the dishes and bookings of the day. */
export async function deleteDayR2(password: string, date: IsoDate): Promise<FullState> {
  return staffWrite("deleteDayR2", password, { date });
}

/** `deleteBookingR2` (02 § 4.7, 06 § 7.1). */
export async function deleteBookingR2(password: string, id: string): Promise<FullState> {
  return staffWrite("deleteBookingR2", password, { id });
}

/** `editBookingR2` (02 § 4.7, 06 § 7.4). */
export async function editBookingR2(
  password: string,
  input: EditBookingR2Input,
): Promise<FullState> {
  const body = {
    id: input.id,
    nom: input.name,
    contact: input.contact,
    classe: input.className,
    qte: input.portions,
    mode: apiServiceMode(input.serviceMode),
    observation: input.observation,
  };
  return staffWrite("editBookingR2", password, body);
}

/** `setConfigField` (02 § 4.7, 06 § 2.2): one setting per request; the settings panel sends them in sequence. */
export async function setConfigField(password: string, input: SettingInput): Promise<FullState> {
  const body = { key: SETTINGS_API_KEYS[input.key], value: input.value };
  return staffWrite("setConfigField", password, body);
}
