import { defineMessages } from "react-intl";

// Texts shared by several files (PLAN § 3.10, § 5.0): texts used by one file stay in that file. Every text is
// copied from docs/spec/ (04 § 9, 00 § 2.3, 06) or from PLAN annexe F, spaces and punctuation included.
// Value types of each message: react-intl types `formatMessage` from them (a descriptor without them takes no value).

type NoValues = Record<string, never>;

/** Texts of the public page, also used by the staff mode. */
export const commonMessages = defineMessages<{
  book: NoValues;
  cancel: NoValues;
  close: NoValues;
  save: NoValues;
  saving: NoValues;
  confirmBooking: NoValues;
  bookingConfirmed: NoValues;
  bookingDuplicate: NoValues;
  r2Closed: { name2: string };
  noService: NoValues;
  soldOut: NoValues;
  serviceMode: NoValues;
  takeaway: NoValues;
  dineIn: NoValues;
  dineInOnly: NoValues;
  nameLabel: NoValues;
  namePlaceholder: NoValues;
  classLabel: NoValues;
  classPlaceholder: NoValues;
  emailPlaceholder: NoValues;
  emailInvalid: NoValues;
  observationLabel: NoValues;
  observationPlaceholder: NoValues;
  seatsLegend: { max: number };
  students: NoValues;
  staffMembers: NoValues;
  externals: NoValues;
  counterWithPrice: { label: string; price: string };
  counterDecrement: { label: string };
  counterIncrement: { label: string };
  atLeastOnePerson: NoValues;
  maxSeats: { count: number };
  maxPortions: { count: number };
  quantityDecrement: { name: string };
  quantityIncrement: { name: string };
  offline: NoValues;
  serviceUnavailable: NoValues;
  slowWrite: NoValues;
}>({
  book: {
    id: "common.action.book",
    defaultMessage: "Réserver",
    description: "00 § 2.3, 04 § 9 — bouton d'ouverture du formulaire (fiches R1 et R2)",
  },
  cancel: {
    id: "common.action.cancel",
    defaultMessage: "Annuler",
    description: "00 § 2.3 — bouton de fermeture d'un formulaire",
  },
  close: {
    id: "common.action.close",
    defaultMessage: "Fermer",
    description: "00 § 2.3, 04 § 7 — bouton du récapitulatif",
  },
  save: {
    id: "common.action.save",
    defaultMessage: "Enregistrer",
    description: "06 § 5.1, § 6.3, § 7.3, § 7.4 — bouton d'envoi d'une modification",
  },
  saving: {
    id: "common.action.saving",
    defaultMessage: "Enregistrement…",
    description: "08 § 4.2, 06 § 5.1, § 6.3, § 7.3 — libellé du bouton occupé d'une modification",
  },
  confirmBooking: {
    id: "public.form.submit",
    defaultMessage: "Confirmer la réservation",
    description: "00 § 2.3, 04 § 5.2-5.3 — bouton d'envoi des formulaires publics R1 et R2",
  },
  bookingConfirmed: {
    id: "public.toast.bookingConfirmed",
    defaultMessage: "Réservation confirmée.",
    description: "04 § 9 — toast de succès d'une réservation R1 ou R2",
  },
  bookingDuplicate: {
    id: "public.toast.duplicate",
    defaultMessage:
      "Cette réservation était déjà enregistrée : elle n'a pas été ajoutée une seconde fois.",
    description: "04 § 9, D-16 — toast neutre d'un doublon (_duplicate)",
  },
  r2Closed: {
    id: "public.r2.cutoff",
    defaultMessage:
      "Commandes en ligne clôturées à 10h. Venez au restaurant {name2} à partir de 12h pour commander sur place.",
    description:
      "04 § 5.3, § 9, 01 § 3.7 — clôture des commandes R2 à 10 h (toast neutre, note de la fiche)",
  },
  noService: {
    id: "public.dayCard.noService",
    defaultMessage: "Aucune réservation possible ce jour-là.",
    description: "00 § 2.3, 04 § 4.1, § 9 — fiche d'un jour sans service (R1 et R2)",
  },
  soldOut: {
    id: "public.dish.soldOut",
    defaultMessage: "Épuisé",
    description: "00 § 2.3, 04 § 5.3, D-02 — plat sans portion restante (formulaire R2 et fiche)",
  },
  serviceMode: {
    id: "common.serviceMode.label",
    defaultMessage: "Mode de service",
    description: "04 § 5.3, 06 § 7.4, § 8.3 — groupe « À emporter » / « Sur place »",
  },
  takeaway: {
    id: "common.serviceMode.takeaway",
    defaultMessage: "À emporter",
    description: "04 § 5.3, § 9, 06 § 7.4, § 8.3 — mode de service R2",
  },
  dineIn: {
    id: "common.serviceMode.dineIn",
    defaultMessage: "Sur place",
    description: "04 § 5.3, § 9, 06 § 7.4, § 8.3 — mode de service R2",
  },
  dineInOnly: {
    id: "public.r2.form.dineInOnly",
    defaultMessage: "Sur place uniquement ce jour-là : repas au prix d'un ticket restaurant.",
    description: "04 § 5.3, § 9 — aide sous le mode de service un jour au ticket restaurant",
  },
  nameLabel: {
    id: "common.form.name.label",
    defaultMessage: "Nom et prénom",
    description: "04 § 5.2, 06 § 8.1 — libellé du nom (formulaires publics, ajout d'une personne)",
  },
  namePlaceholder: {
    id: "common.form.name.placeholder",
    defaultMessage: "Ex. Cyrille Ungerer",
    description: "04 § 5.2, 06 § 8.1 — exemple du champ nom",
  },
  classLabel: {
    id: "common.form.className.label",
    defaultMessage: "Classe ou service",
    description: "04 § 5.2, 06 § 7.2, § 8.1 — libellé de la classe",
  },
  classPlaceholder: {
    id: "common.form.className.placeholder",
    defaultMessage: "Ex. TS2 ou vie scolaire",
    description: "04 § 5.2, 06 § 8.1 — exemple du champ classe",
  },
  emailPlaceholder: {
    id: "common.form.email.placeholder",
    defaultMessage: "Ex. Ariele.gsell@exemple.fr",
    description: "04 § 5.2, 06 § 8.1 — exemple du champ email",
  },
  emailInvalid: {
    id: "common.form.email.invalid",
    defaultMessage: "Vérifiez votre adresse email (ex. Ariele.gsell@exemple.fr).",
    description: "04 § 5.2, § 9, 06 § 8.1 — adresse email mal formée",
  },
  observationLabel: {
    id: "common.form.observation.label",
    defaultMessage: "Observation (optionnel)",
    description: "04 § 5.2, 06 § 7.2, § 8.1 — libellé de l'observation",
  },
  observationPlaceholder: {
    id: "common.form.observation.placeholder",
    defaultMessage: "Ex. table partagée, allergie…",
    description: "04 § 5.2, 06 § 8.1 — exemple du champ observation",
  },
  seatsLegend: {
    id: "common.form.seats.legend",
    defaultMessage: "Nombre de personnes ({max} au maximum)",
    description: "04 § 5.2, 06 § 7.3, § 8.2 — légende des compteurs R1",
  },
  students: {
    id: "common.form.seats.students",
    defaultMessage: "Élèves",
    description: "04 § 5.2, 06 § 7.3, § 8.2, D-17 — compteur R1 (libellé et boutons −/+)",
  },
  staffMembers: {
    id: "common.form.seats.staff",
    defaultMessage: "Personnels",
    description: "04 § 5.2, 06 § 7.3, § 8.2, D-17 — compteur R1 (libellé et boutons −/+)",
  },
  externals: {
    id: "common.form.seats.externals",
    defaultMessage: "Extérieurs",
    description: "04 § 5.2, 06 § 7.3, § 8.2, D-17 — compteur R1 (libellé et boutons −/+)",
  },
  counterWithPrice: {
    id: "common.form.seats.counterLabel",
    defaultMessage: "{label} · {price}",
    description:
      "04 § 5.2, 06 § 7.3 — libellé d'un compteur R1 avec son tarif (« Élèves · 4,95 € »)",
  },
  counterDecrement: {
    id: "public.r1.form.counter.decrement",
    defaultMessage: "Diminuer : {label}",
    description: "PLAN annexe F, D-17 — bouton − d'un compteur R1",
  },
  counterIncrement: {
    id: "public.r1.form.counter.increment",
    defaultMessage: "Augmenter : {label}",
    description: "PLAN annexe F, D-17 — bouton + d'un compteur R1",
  },
  atLeastOnePerson: {
    id: "common.form.seats.required",
    defaultMessage: "Indiquez au moins une personne.",
    description: "04 § 5.2, § 9, 06 § 7.3, § 8.2 — aucun couvert saisi",
  },
  maxSeats: {
    id: "common.form.seats.max",
    defaultMessage:
      "{count, plural, one {# couvert} other {# couverts}} au maximum (places restantes ce jour-là).",
    description:
      "06 § 8.2, D-18 — total au-delà des places restantes (public et ajout d'une personne)",
  },
  maxPortions: {
    id: "common.form.portions.max",
    defaultMessage:
      "{count, plural, one {# portion} other {# portions}} au maximum (stock restant).",
    description:
      "06 § 8.3, D-18 — quantité au-delà du stock restant (public et ajout d'une personne)",
  },
  quantityDecrement: {
    id: "public.r2.form.quantity.decrement",
    defaultMessage: "Retirer une portion : {name}",
    description: "PLAN annexe F, D-17 — bouton − d'une quantité R2",
  },
  quantityIncrement: {
    id: "public.r2.form.quantity.increment",
    defaultMessage: "Ajouter une portion : {name}",
    description: "PLAN annexe F, D-17 — bouton + d'une quantité R2",
  },
  offline: {
    id: "common.error.offline",
    defaultMessage: "Vous semblez hors ligne. Vérifiez votre connexion internet, puis réessayez.",
    description: "D-14, 03 § 3.1 — écriture qui échoue hors ligne",
  },
  serviceUnavailable: {
    id: "public.error.serviceUnavailable",
    defaultMessage:
      "Le service de réservation ne répond pas. Réessayez dans un instant : une même réservation n'est jamais enregistrée deux fois.",
    description: "PLAN annexe F, D-14 — réservation publique : service muet ou réponse illisible",
  },
  slowWrite: {
    id: "common.write.slow",
    defaultMessage:
      "Le service met du temps à répondre. Gardez cette page ouverte : la confirmation s'affichera ici.",
    description: "PLAN annexe F, D-15 — sous le bouton occupé après 20 s, public et collègue",
  },
});
