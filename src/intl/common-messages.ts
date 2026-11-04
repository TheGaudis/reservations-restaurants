import { defineMessage } from "react-intl";

// Texts shared by several files (PLAN § 3.10, § 5.0): texts used by one file stay in that file. Every text is
// copied from docs/spec/ (04 § 9, 00 § 2.3, 06) or from PLAN annexe F, spaces and punctuation included.
// A message with values names their types in the type argument of `defineMessage`: react-intl types `formatMessage`
// from it.

export const cancelAction = defineMessage({
  id: "common.action.cancel",
  defaultMessage: "Annuler",
  description: "00 § 2.3 — bouton de fermeture d'un formulaire",
});

export const saveAction = defineMessage({
  id: "common.action.save",
  defaultMessage: "Enregistrer",
  description: "06 § 5.1, § 6.3, § 7.3, § 7.4 — bouton d'envoi d'une modification",
});

export const savingLabel = defineMessage({
  id: "common.action.saving",
  defaultMessage: "Enregistrement…",
  description: "08 § 4.2, 06 § 5.1, § 6.3, § 7.3 — libellé du bouton occupé d'une modification",
});

export const r2ClosedMessage = defineMessage<{ name2: string }>({
  id: "public.r2.cutoff",
  defaultMessage:
    "Commandes en ligne clôturées à 10h. Venez au restaurant {name2} à partir de 12h pour commander sur place.",
  description:
    "04 § 5.3, § 9, 01 § 3.7 — clôture des commandes R2 à 10 h (toast neutre, note de la fiche)",
});

export const soldOutLabel = defineMessage({
  id: "public.dish.soldOut",
  defaultMessage: "Épuisé",
  description: "00 § 2.3, 04 § 5.3, D-02 — plat sans portion restante (formulaire R2 et fiche)",
});

export const serviceModeLabel = defineMessage({
  id: "common.serviceMode.label",
  defaultMessage: "Mode de service",
  description: "04 § 5.3, 06 § 7.4, § 8.3 — groupe « À emporter » / « Sur place »",
});

export const takeawayLabel = defineMessage({
  id: "common.serviceMode.takeaway",
  defaultMessage: "À emporter",
  description: "04 § 5.3, § 9, 06 § 7.4, § 8.3 — mode de service R2",
});

export const dineInLabel = defineMessage({
  id: "common.serviceMode.dineIn",
  defaultMessage: "Sur place",
  description: "04 § 5.3, § 9, 06 § 7.4, § 8.3 — mode de service R2",
});

export const classLabel = defineMessage({
  id: "common.form.className.label",
  defaultMessage: "Classe ou service",
  description: "04 § 5.2, 06 § 7.2, § 8.1 — libellé de la classe",
});

export const observationLabel = defineMessage({
  id: "common.form.observation.label",
  defaultMessage: "Observation (optionnel)",
  description: "04 § 5.2, 06 § 7.2, § 8.1 — libellé de l'observation",
});

export const studentsLabel = defineMessage({
  id: "common.form.seats.students",
  defaultMessage: "Élèves",
  description: "04 § 5.2, 06 § 7.3, § 8.2, D-17 — compteur R1 (libellé et boutons −/+)",
});

export const staffMembersLabel = defineMessage({
  id: "common.form.seats.staff",
  defaultMessage: "Personnels",
  description: "04 § 5.2, 06 § 7.3, § 8.2, D-17 — compteur R1 (libellé et boutons −/+)",
});

export const externalsLabel = defineMessage({
  id: "common.form.seats.externals",
  defaultMessage: "Extérieurs",
  description: "04 § 5.2, 06 § 7.3, § 8.2, D-17 — compteur R1 (libellé et boutons −/+)",
});

export const atLeastOnePersonMessage = defineMessage({
  id: "common.form.seats.required",
  defaultMessage: "Indiquez au moins une personne.",
  description: "04 § 5.2, § 9, 06 § 7.3, § 8.2 — aucun couvert saisi",
});

export const maxPortionsMessage = defineMessage<{ count: number }>({
  id: "common.form.portions.max",
  defaultMessage: "{count, plural, one {# portion} other {# portions}} au maximum (stock restant).",
  description:
    "06 § 8.3, D-18 — quantité au-delà du stock restant (public et ajout d'une personne)",
});

export const quantityDecrementLabel = defineMessage<{ name: string }>({
  id: "public.r2.form.quantity.decrement",
  defaultMessage: "Retirer une portion : {name}",
  description: "PLAN annexe F, D-17 — bouton − d'une quantité R2",
});

export const quantityIncrementLabel = defineMessage<{ name: string }>({
  id: "public.r2.form.quantity.increment",
  defaultMessage: "Ajouter une portion : {name}",
  description: "PLAN annexe F, D-17 — bouton + d'une quantité R2",
});
