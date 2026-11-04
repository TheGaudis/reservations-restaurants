import { defineMessage } from "react-intl";

// Texts shared by several files of the staff mode (06, PLAN annexe F). Copied from docs/spec/ or PLAN annexe F, spaces
// and punctuation included.

export const addingLabel = defineMessage({
  id: "staff.action.adding",
  defaultMessage: "Ajout en cours…",
  description: "08 § 4.2, 06 § 6.2, § 8.2, § 8.3 — libellé du bouton occupé d'un ajout",
});

export const staffNameRequiredMessage = defineMessage({
  id: "staff.form.name.required",
  defaultMessage: "Indiquez le nom.",
  description: "06 § 7.2, § 8.1 — nom vide (modification, ajout d'une personne)",
});

export const staffClassRequiredMessage = defineMessage({
  id: "staff.form.className.required",
  defaultMessage: "Indiquez la classe ou le service.",
  description: "06 § 7.2, § 8.1 — classe vide (modification, ajout d'une personne)",
});

export const pastDateMessage = defineMessage({
  id: "staff.openDay.error.pastDate",
  defaultMessage: "Choisissez la date d'aujourd'hui ou une date ultérieure.",
  description: "PLAN annexe F, D-19 — date passée dans « Ouvrir un jour » (R1 et R2)",
});

export const openedByLabel = defineMessage({
  id: "staff.openDay.openedBy.label",
  defaultMessage: "Votre nom (collègue qui ouvre ce jour)",
  description: "06 § 4.1, § 4.2 — libellé du collègue qui ouvre le jour",
});

export const themeLabel = defineMessage({
  id: "staff.day.theme.label",
  defaultMessage: "Thème du jour (optionnel)",
  description: "06 § 4.1, § 4.2, § 5.1 — libellé du thème",
});

export const openDaySubmitAction = defineMessage({
  id: "staff.openDay.submit",
  defaultMessage: "Ouvrir ce jour",
  description: "06 § 4.1, § 4.2 — bouton d'envoi de « Ouvrir un jour »",
});

export const openingLabel = defineMessage({
  id: "staff.openDay.pending",
  defaultMessage: "Ouverture en cours…",
  description: "08 § 4.2, 06 § 4.1, § 4.2 — libellé du bouton occupé de « Ouvrir un jour »",
});

export const dishNamePlaceholder = defineMessage({
  id: "staff.dishForm.name.placeholder",
  defaultMessage: "Ex. salade César",
  description:
    "06 § 4.2, § 6.1 — exemple de nom d'un plat (ligne de « Ouvrir un jour » R2, ajout d'un plat)",
});

export const dishStockLabel = defineMessage({
  id: "staff.dishForm.stock.label",
  defaultMessage: "Stock",
  description:
    "06 § 4.2, § 6.1 — stock d'un plat (en-tête des lignes de « Ouvrir un jour » R2, formulaire de plat)",
});

export const dishPriceLabel = defineMessage({
  id: "staff.dishForm.price.label",
  defaultMessage: "Prix (optionnel)",
  description:
    "06 § 4.2, § 6.1 — prix d'un plat (en-tête des lignes de « Ouvrir un jour » R2, formulaire de plat)",
});

export const dishVoucherLabel = defineMessage({
  id: "staff.dishForm.voucher.label",
  defaultMessage: "Ticket restaurant",
  description: "06 § 4.2-4.3, § 6.1 — case du plat payé par un ticket restaurant",
});

export const dishVoucherPricePlaceholder = defineMessage({
  id: "staff.dishForm.price.voucherPlaceholder",
  defaultMessage: "Ticket",
  description: "06 § 4.3 — exemple du prix désactivé d'un plat au ticket restaurant",
});

export const dishZeroPriceMessage = defineMessage({
  id: "staff.dish.error.zeroPrice",
  defaultMessage: "Indiquez un prix supérieur à 0, ou laissez le champ vide.",
  description:
    "PLAN annexe F, D-22 — prix d'un plat à 0, négatif ou illisible (« Ouvrir un jour » R2, plats)",
});

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
