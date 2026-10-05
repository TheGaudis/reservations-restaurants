import type * as v from "valibot";
import { expectTypeOf, it } from "vitest";

import type {
  BookingResultSchema,
  DishSchema,
  EmailStatusSchema,
  PortionTotalSchema,
  PublicStateSchema,
  SeatTotalSchema,
  ServiceDayR1Schema,
  ServiceDayR2Schema,
  SettingsSchema,
  WriteResponseSchema,
} from "@/api/schemas";
import type {
  BookingR1Schema,
  BookingR2Schema,
  FullStateSchema,
  StaffServiceDayR1Schema,
  StaffServiceDayR2Schema,
} from "@/api/staff-schemas";
import type {
  BookingR1,
  BookingR2,
  BookingResult,
  Dish,
  EmailStatus,
  FullState,
  PortionTotal,
  PublicState,
  SeatTotal,
  ServiceDayR1,
  ServiceDayR2,
  Settings,
  StaffServiceDayR1,
  StaffServiceDayR2,
  WriteResponse,
} from "@/domain/types";

// domain/types.ts is the source of truth (PLAN § 3.3.6): each schema must produce exactly its type. tsc checks
// these lines (pnpm typecheck); Vitest runs the test so that the file counts as one.
it("produces the hand-written types of domain/types.ts", () => {
  expectTypeOf<v.InferOutput<typeof SettingsSchema>>().toEqualTypeOf<Settings>();
  expectTypeOf<v.InferOutput<typeof ServiceDayR1Schema>>().toEqualTypeOf<ServiceDayR1>();
  expectTypeOf<v.InferOutput<typeof StaffServiceDayR1Schema>>().toEqualTypeOf<StaffServiceDayR1>();
  expectTypeOf<v.InferOutput<typeof ServiceDayR2Schema>>().toEqualTypeOf<ServiceDayR2>();
  expectTypeOf<v.InferOutput<typeof StaffServiceDayR2Schema>>().toEqualTypeOf<StaffServiceDayR2>();
  expectTypeOf<v.InferOutput<typeof DishSchema>>().toEqualTypeOf<Dish>();
  expectTypeOf<v.InferOutput<typeof BookingR1Schema>>().toEqualTypeOf<BookingR1>();
  expectTypeOf<v.InferOutput<typeof BookingR2Schema>>().toEqualTypeOf<BookingR2>();
  expectTypeOf<v.InferOutput<typeof SeatTotalSchema>>().toEqualTypeOf<SeatTotal>();
  expectTypeOf<v.InferOutput<typeof PortionTotalSchema>>().toEqualTypeOf<PortionTotal>();
  expectTypeOf<v.InferOutput<typeof PublicStateSchema>>().toEqualTypeOf<PublicState>();
  expectTypeOf<v.InferOutput<typeof FullStateSchema>>().toEqualTypeOf<FullState>();
  expectTypeOf<v.InferOutput<typeof EmailStatusSchema>>().toEqualTypeOf<EmailStatus>();
  expectTypeOf<v.InferOutput<typeof BookingResultSchema>>().toEqualTypeOf<BookingResult>();
  expectTypeOf<v.InferOutput<typeof WriteResponseSchema>>().toEqualTypeOf<WriteResponse>();
});
