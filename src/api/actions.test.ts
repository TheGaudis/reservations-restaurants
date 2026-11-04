import { describe, expect, it } from "vitest";

import { addBookingR1, addBookingR2Multi } from "@/api/actions";
import { BusinessError } from "@/api/errors";
import type { WriteResponse } from "@/domain/types";
import addBookingR1Request from "@/mocks/fixtures/add-booking-r1-request.json" with { type: "json" };
import addBookingR2MultiRequest from "@/mocks/fixtures/add-booking-r2-multi-request.json" with { type: "json" };
import { exampleDb } from "@/mocks/fixtures/example-db";
import { fakeScriptPerTest, SCRIPT_URL } from "@/test/fake-script-server";

// Bodies of the public bookings (02 § 4.4, § 4.5), read in the fake script's requests: exactly the examples of the
// contract, in the script's names.

const start = fakeScriptPerTest();

describe("public bookings (02 § 4.4, § 4.5)", () => {
  it("sends the addBookingR1 body of 02 § 4.4 and translates the answer", async () => {
    const fakeScript = start({ seed: exampleDb() });
    const response = await addBookingR1({
      date: "2026-10-05",
      name: "Cyrille Ungerer",
      contact: "c.ungerer@exemple.fr",
      className: "TS2",
      students: 2,
      staffMembers: 1,
      externals: 0,
      observation: "Table partagée",
      requestId: "1b4e28ba-2fa1-11d2-883f-0016d3cca427",
    });
    expect(fakeScript.requests.map(({ method, url }) => [method, url])).toStrictEqual([
      ["POST", SCRIPT_URL],
    ]);
    expect(fakeScript.requests[0]?.json).toStrictEqual(addBookingR1Request);
    expect(response).toMatchObject<Partial<WriteResponse>>({
      duplicate: false,
      emailStatus: { sent: true, reason: null },
      bookingResult: null,
    });
    expect(response.state.r1Booked).toStrictEqual([{ date: "2026-10-05", seats: 15 }]);
  });

  it("sends the addBookingR2Multi body of 02 § 4.5, mode surplace", async () => {
    const fakeScript = start({ seed: exampleDb() });
    const response = await addBookingR2Multi({
      date: "2026-10-06",
      name: "Ariele Gsell",
      contact: "a.gsell@exemple.fr",
      className: "Vie scolaire",
      serviceMode: "dineIn",
      items: [
        { dishId: "3f1c2a9e-…", portions: 2 },
        { dishId: "8b7d0c11-…", portions: 1 },
      ],
      observation: "",
      requestId: "6fa459ea-ee8a-3ca4-894e-db77e160355e",
    });
    expect(fakeScript.requests[0]?.json).toStrictEqual(addBookingR2MultiRequest);
    expect(response.bookingResult?.confirmed).toStrictEqual([
      { dishId: "3f1c2a9e-…", name: "Lasagnes", portions: 2, price: 4.5, voucher: false },
      { dishId: "8b7d0c11-…", name: "Bowl", portions: 1, price: null, voucher: true },
    ]);
  });

  it("sends mode emporter for takeaway (01 § 2.6)", async () => {
    const fakeScript = start();
    await addBookingR2Multi({
      date: "2026-10-13",
      name: "Inès Roux",
      contact: "",
      className: "",
      serviceMode: "takeaway",
      items: [{ dishId: "r2i-d+8-lasagnes", portions: 1 }],
      observation: "",
      requestId: "r",
    });
    expect(fakeScript.requests[0]?.json).toMatchObject({ mode: "emporter" });
    expect(fakeScript.db.r2Bookings.at(-1)).toMatchObject({ Mode: "emporter", Qte: 1 });
  });

  it("reads a duplicate (02 § 5.3)", async () => {
    start();
    const input = {
      date: "2026-10-06",
      name: "Inès Roux",
      contact: "",
      className: "",
      students: 1,
      staffMembers: 0,
      externals: 0,
      observation: "",
      requestId: "same",
    };
    await addBookingR1(input);
    await expect(addBookingR1(input)).resolves.toMatchObject({ duplicate: true });
  });

  it("throws the refusal of the script as a BusinessError (02 § 4.4)", async () => {
    start();
    const input = {
      date: "2026-10-06",
      name: "Inès Roux",
      contact: "",
      className: "",
      students: 6,
      staffMembers: 0,
      externals: 0,
      observation: "",
      requestId: "r",
    };
    await expect(addBookingR1(input)).rejects.toStrictEqual(
      new BusinessError("Il ne reste que 5 couvert(s) pour ce jour."),
    );
  });
});
