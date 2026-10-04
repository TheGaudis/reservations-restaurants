import { afterEach, beforeEach, expect, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { addBookingR2Multi } from "@/api/actions";
import { useClock, watchR2Cutoff } from "@/background/clock";
import { DayCardR2 } from "@/features/r2/DayCardR2";
import { OrderFormR2Slot } from "@/features/r2/OrderFormR2Slot";
import { purgeStaffSession } from "@/queries/purge";
import { useSessionStore } from "@/session/session";
import { fakeScript } from "@/test/browser-fake-script";
import { TEST_NOW } from "@/test/clock";
import { renderColumn } from "@/test/column-page";
import { showToast } from "@/ui/feedback/toast";

// Helpers of the R2 order form tests (features/r2/OrderFormR2*.test.tsx): one public R2 column with its form, on the
// fake script of the test (`renderColumn`, R-36).

export const CLOSED =
  "Commandes en ligne clôturées à 10h. Venez au restaurant Aristide à partir de 12h pour commander sur place.";
export const NO_DISH = "Choisissez au moins un plat.";

const initialClock = useClock.getState();
let stops: Array<() => void> = [];

/** Date at TEST_NOW for each test; clock, background task and local copy put back afterwards. */
export function setUpOrderFormTests() {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(TEST_NOW);
  });
  afterEach(() => {
    for (const stop of stops) stop();
    stops = [];
    useClock.setState(initialClock, true);
    vi.useRealTimers();
    localStorage.clear();
  });
}

export const column = () => page;
export const renderPage = async (url: string) =>
  renderColumn(url, "r2", <DayCardR2 form={<OrderFormR2Slot />} />);
export const field = (name: string | RegExp) => column().getByRole("textbox", { name });
export const quantity = (dish: string) => field(`Quantité : ${dish}`);
export const button = (name: string) => column().getByRole("button", { name, exact: true });
export const reserve = () => button("Réserver");
export const submit = () =>
  column().getByRole("button", { name: /^(Confirmer la réservation|Envoi en cours…)$/u });
export const toastText = (text: string | RegExp) => page.getByText(text).first();

/** Orders sent by the form, without those of `otherVisitorTakes`. */
export function posts() {
  return fakeScript()
    .requests.filter((request) => request.method === "POST")
    .map((request) => request.json as Record<string, unknown>)
    .filter((body) => !String(body["requestId"]).startsWith("other-"));
}

/** Total as rendered, non-breaking spaces kept; empty when nothing priced is chosen. */
export function liveTotal(): string {
  const total = column()
    .getByText(/^Total/u)
    .elements();
  return total.map((element) => element.textContent).join("|");
}

export async function openForm(url = "/") {
  const rendered = await renderPage(url);
  await userEvent.click(reserve());
  await expect.element(quantity("Lasagnes")).toHaveFocus();
  return rendered;
}

export async function typeQuantity(dish: string, value: string) {
  await userEvent.clear(quantity(dish));
  if (value !== "") await userEvent.type(quantity(dish), value);
}

export const PERSON = {
  name: "Ariele Gsell",
  contact: "a.gsell@exemple.fr",
  className: "Vie scolaire",
};

export async function fillPerson(
  person: { name: string; contact: string; className: string } = PERSON,
) {
  await userEvent.type(field("Nom et prénom"), person.name);
  await userEvent.type(field("Adresse email"), person.contact);
  await userEvent.type(field("Classe ou service"), person.className);
}

/** Another visitor orders through the script meanwhile (02 § 4.5). */
export async function otherVisitorTakes(dishId: string, portions: number) {
  await addBookingR2Multi({
    date: "2026-10-05",
    name: "Autre visiteur",
    contact: "",
    className: "TS1",
    serviceMode: "dineIn",
    items: [{ dishId, portions }],
    observation: "",
    requestId: `other-${dishId}`,
  });
}

/** The 10:00 task of `getRouter()` (background/start.ts), on the router and cache of the test. */
export function watchCutoff(rendered: Awaited<ReturnType<typeof renderPage>>) {
  stops.push(
    watchR2Cutoff({
      router: rendered.router,
      queryClient: rendered.queryClient,
      session: useSessionStore,
      purgeStaffSession,
      showToast,
    }),
  );
}
