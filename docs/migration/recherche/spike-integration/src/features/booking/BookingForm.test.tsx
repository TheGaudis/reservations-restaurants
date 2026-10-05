import { expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { BookingForm } from "@/features/booking/BookingForm";
import { renderWithProviders } from "@/test/render";

it("revalidateLogic + canSubmitWhenInvalid: error on submit, cleared on change", async () => {
  const screen = await renderWithProviders(<BookingForm remaining={3} />);
  const name = screen.getByRole("textbox", { name: "Nom" });
  await expect.element(screen.getByRole("alert")).not.toBeInTheDocument();
  await screen.getByRole("button", { name: "Réserver" }).click();
  await expect.element(screen.getByRole("alert")).toHaveTextContent("Indiquez votre nom.");
  await expect.element(name).toHaveAttribute("aria-invalid", "true");
  await userEvent.type(name, "Cyrille");
  await expect.element(screen.getByRole("alert")).not.toBeInTheDocument();
});
