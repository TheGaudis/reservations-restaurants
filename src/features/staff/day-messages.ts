import { defineMessage } from "react-intl";

// Texts of the forms of an R1 day shared by « Ouvrir un jour » and « Modifier ce jour » (06 § 4.1, § 5.1), copied
// from docs/spec/. The other texts of these forms live in the file that uses them; texts shared with other staff
// files are in intl/staff-messages.ts.

export const capacityLabel = defineMessage({
  id: "staff.day.capacity.label",
  defaultMessage: "Nombre de couverts disponibles",
  description: "06 § 4.1, § 5.1 — libellé de la capacité d'un jour R1",
});

export const capacityRequiredMessage = defineMessage({
  id: "staff.day.capacity.required",
  defaultMessage: "Indiquez un nombre de couverts supérieur à 0.",
  description: "06 § 4.1, § 5.1 — capacité vide, nulle ou négative",
});

export const menuLabel = defineMessage({
  id: "staff.day.menu.label",
  defaultMessage: "Menu du jour (optionnel)",
  description: "06 § 4.1, § 5.1 — libellé du menu d'un jour R1",
});
