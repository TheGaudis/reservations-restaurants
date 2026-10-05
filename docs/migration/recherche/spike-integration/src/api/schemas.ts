import * as v from "valibot";

const IsoDate = v.pipe(v.string(), v.isoDate());
const NumberLike = v.pipe(
  v.union([v.number(), v.pipe(v.string(), v.nonEmpty())]),
  v.transform(Number),
  v.finite(),
);

const ApiDayR1 = v.object({
  Date: IsoDate,
  Capacite: NumberLike,
  Menu: v.string(),
  Theme: v.string(),
});

export const PublicState = v.pipe(
  v.object({
    etag: v.string(),
    r1Days: v.array(ApiDayR1),
    r1Bookings: v.array(v.object({ Date: IsoDate, Qte: NumberLike })),
    name1: v.string(),
    priceEleve: NumberLike,
  }),
  v.transform((s) => ({
    etag: s.etag,
    name1: s.name1,
    priceStudent: s.priceEleve,
    daysR1: s.r1Days.map((d) => ({
      date: d.Date,
      capacity: d.Capacite,
      menu: d.Menu,
      booked: s.r1Bookings.filter((b) => b.Date === d.Date).reduce((n, b) => n + b.Qte, 0),
    })),
  })),
);
export type PublicState = v.InferOutput<typeof PublicState>;
