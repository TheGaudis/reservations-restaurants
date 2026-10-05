import { defineMessages } from "react-intl";

// Texts of the forms of an R1 day shared by « Ouvrir un jour » and « Modifier ce jour » (06 § 4.1, § 5.1), copied
// from docs/spec/. The other texts of these forms live in the file that uses them; texts shared with other staff
// files are in intl/staff-messages.ts.

export const dayMessages = defineMessages<{
  capacityLabel: Record<string, never>;
  capacityRequired: Record<string, never>;
  menuLabel: Record<string, never>;
  capacityBelowBooked: { used: string };
}>({
  capacityLabel: {
    id: "staff.day.capacity.label",
    defaultMessage: "Nombre de couverts disponibles",
    description: "06 § 4.1, § 5.1 — libellé de la capacité d'un jour R1",
  },
  capacityRequired: {
    id: "staff.day.capacity.required",
    defaultMessage: "Indiquez un nombre de couverts supérieur à 0.",
    description: "06 § 4.1, § 5.1 — capacité vide, nulle ou négative",
  },
  menuLabel: {
    id: "staff.day.menu.label",
    defaultMessage: "Menu du jour (optionnel)",
    description: "06 § 4.1, § 5.1 — libellé du menu d'un jour R1",
  },
  capacityBelowBooked: {
    id: "staff.editDay.capacity.belowBooked",
    defaultMessage:
      "Impossible : {used} couvert(s) déjà réservé(s) pour ce jour, la capacité ne peut pas être inférieure.",
    description:
      "02 § 4.7, 06 § 5.1, D-19 — message du script repris avant l'envoi : capacité sous les couverts réservés",
  },
});
