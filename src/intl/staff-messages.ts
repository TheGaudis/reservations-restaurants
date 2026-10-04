import { defineMessages } from "react-intl";

// Texts shared by several files of the staff mode (06, PLAN annexe F), apart from intl/common-messages.ts so that the
// public chunk does not carry them. Copied from docs/spec/ or PLAN annexe F, spaces and punctuation included.

type NoValues = Record<string, never>;

/**
 * Texts of the staff mode used by several files.
 */
export const staffCommonMessages = defineMessages<{
  edit: NoValues;
  delete: NoValues;
  adding: NoValues;
  addPerson: NoValues;
  addPersonSubmit: NoValues;
  personAdded: NoValues;
  personDuplicate: NoValues;
  emailFailed: NoValues;
  emailOptionalLabel: NoValues;
  emailOptionalHelp: NoValues;
  bookingEdited: NoValues;
  bookingDeleted: NoValues;
  bookingDeleteDetail: NoValues;
  nameLabel: NoValues;
  nameRequired: NoValues;
  classRequired: NoValues;
  contactLabel: NoValues;
  contactRequired: NoValues;
  quantityRequired: NoValues;
  dateLabel: NoValues;
  dateRequired: NoValues;
  pastDate: NoValues;
  openedByLabel: NoValues;
  themeLabel: NoValues;
  openDaySubmit: NoValues;
  opening: NoValues;
  dayAdded: NoValues;
  deleteDay: NoValues;
  deleteDayDetail: NoValues;
  deleteDayWithBookings: { n: number };
  dayDeleted: NoValues;
  serviceUnavailable: NoValues;
  dishNamePlaceholder: NoValues;
  dishStockLabel: NoValues;
  dishPriceLabel: NoValues;
  dishVoucherLabel: NoValues;
  dishVoucherPricePlaceholder: NoValues;
  dishZeroPrice: NoValues;
}>({
  edit: {
    id: "staff.booking.edit",
    defaultMessage: "Modifier",
    description: "06 § 7.1 — bouton d'une ligne de réservation (R1 et R2)",
  },
  delete: {
    id: "staff.booking.delete",
    defaultMessage: "Supprimer",
    description: "06 § 7.1 — bouton de suppression d'une ligne de réservation (R1 et R2)",
  },
  adding: {
    id: "staff.action.adding",
    defaultMessage: "Ajout en cours…",
    description: "08 § 4.2, 06 § 6.2, § 8.2, § 8.3 — libellé du bouton occupé d'un ajout",
  },
  addPerson: {
    id: "staff.addBooking.open",
    defaultMessage: "+ Ajouter une personne",
    description: "06 § 8 — ouverture de l'ajout d'une personne (fiche R1, plat R2)",
  },
  addPersonSubmit: {
    id: "staff.addBooking.submit",
    defaultMessage: "Ajouter cette personne",
    description: "06 § 8.2, § 8.3 — bouton d'envoi de l'ajout d'une personne",
  },
  personAdded: {
    id: "staff.addBooking.success",
    defaultMessage: "Personne ajoutée.",
    description: "06 § 8.5 — toast de succès de l'ajout d'une personne",
  },
  personDuplicate: {
    id: "staff.addBooking.duplicate",
    defaultMessage:
      "Cette personne était déjà enregistrée : elle n'a pas été ajoutée une seconde fois.",
    description: "06 § 8.5 — toast neutre d'un ajout en doublon (_duplicate)",
  },
  emailFailed: {
    id: "staff.addBooking.emailFailed",
    defaultMessage: "L'email de confirmation n'a pas pu être envoyé.",
    description: "06 § 8.5 — suite du toast quand l'email de confirmation n'est pas parti",
  },
  emailOptionalLabel: {
    id: "staff.addBooking.email.label",
    defaultMessage: "Adresse email (optionnel)",
    description: "06 § 8.1 — libellé de l'email de l'ajout d'une personne",
  },
  emailOptionalHelp: {
    id: "staff.addBooking.email.help",
    defaultMessage: "Si elle est indiquée, la confirmation y est envoyée.",
    description: "06 § 8.1 — aide de l'email de l'ajout d'une personne",
  },
  bookingEdited: {
    id: "staff.booking.edited",
    defaultMessage: "Réservation modifiée.",
    description: "06 § 7.3, § 7.4 — toast de succès d'une modification de réservation",
  },
  bookingDeleted: {
    id: "staff.booking.deleted",
    defaultMessage: "Réservation supprimée.",
    description: "06 § 5.2 — toast de succès d'une suppression de réservation",
  },
  bookingDeleteDetail: {
    id: "staff.booking.delete.confirm",
    defaultMessage: "Confirmer la suppression de cette réservation",
    description: "06 § 5.2 — aria-label et title du bouton armé d'une réservation",
  },
  nameLabel: {
    id: "staff.editBooking.name.label",
    defaultMessage: "Nom",
    description: "06 § 7.2 — libellé du nom d'une réservation modifiée",
  },
  nameRequired: {
    id: "staff.form.name.required",
    defaultMessage: "Indiquez le nom.",
    description: "06 § 7.2, § 8.1 — nom vide (modification, ajout d'une personne)",
  },
  classRequired: {
    id: "staff.form.className.required",
    defaultMessage: "Indiquez la classe ou le service.",
    description: "06 § 7.2, § 8.1 — classe vide (modification, ajout d'une personne)",
  },
  contactLabel: {
    id: "staff.editBooking.contact.label",
    defaultMessage: "Téléphone ou email",
    description: "06 § 7.2 — libellé du contact d'une réservation modifiée (R1 et R2)",
  },
  contactRequired: {
    id: "staff.editBooking.contact.required",
    defaultMessage: "Indiquez un téléphone ou un email.",
    description: "06 § 7.2 — contact vide",
  },
  quantityRequired: {
    id: "staff.form.quantity.required",
    defaultMessage: "Indiquez une quantité supérieure à 0.",
    description: "06 § 7.4, § 8.3 — portions vides ou nulles",
  },
  dateLabel: {
    id: "staff.openDay.date.label",
    defaultMessage: "Date",
    description: "06 § 3.1, § 4.1, § 4.2 — champ Date de « Ouvrir un jour »",
  },
  dateRequired: {
    id: "staff.openDay.date.required",
    defaultMessage: "Choisissez une date.",
    description: "06 § 4.1, § 4.2 — aucune date choisie",
  },
  pastDate: {
    id: "staff.openDay.error.pastDate",
    defaultMessage: "Choisissez la date d'aujourd'hui ou une date ultérieure.",
    description: "PLAN annexe F, D-19 — date passée dans « Ouvrir un jour » (R1 et R2)",
  },
  openedByLabel: {
    id: "staff.openDay.openedBy.label",
    defaultMessage: "Votre nom (collègue qui ouvre ce jour)",
    description: "06 § 4.1, § 4.2 — libellé du collègue qui ouvre le jour",
  },
  themeLabel: {
    id: "staff.day.theme.label",
    defaultMessage: "Thème du jour (optionnel)",
    description: "06 § 4.1, § 4.2, § 5.1 — libellé du thème",
  },
  openDaySubmit: {
    id: "staff.openDay.submit",
    defaultMessage: "Ouvrir ce jour",
    description: "06 § 4.1, § 4.2 — bouton d'envoi de « Ouvrir un jour »",
  },
  opening: {
    id: "staff.openDay.pending",
    defaultMessage: "Ouverture en cours…",
    description: "08 § 4.2, 06 § 4.1, § 4.2 — libellé du bouton occupé de « Ouvrir un jour »",
  },
  dayAdded: {
    id: "staff.openDay.success",
    defaultMessage: "Jour ajouté.",
    description: "06 § 4.1, § 4.2 — toast de succès de « Ouvrir un jour »",
  },
  deleteDay: {
    id: "staff.day.delete",
    defaultMessage: "Supprimer ce jour",
    description: "06 § 5.2 — bouton de suppression d'un jour (R1 et R2)",
  },
  deleteDayDetail: {
    id: "staff.day.delete.confirm",
    defaultMessage: "Confirmer la suppression du jour et de toutes ses réservations",
    description: "06 § 5.2 — aria-label et title du bouton armé d'un jour sans réservation",
  },
  deleteDayWithBookings: {
    id: "staff.day.delete.confirmWithBookings",
    defaultMessage:
      "Confirmer la suppression du jour et de ses {n, plural, one {# réservation} other {# réservations}} (les personnes ne seront pas prévenues)",
    description:
      "PLAN annexe F, D-21 — note et aria-label du bouton armé d'un jour qui a des réservations",
  },
  dayDeleted: {
    id: "staff.day.deleted",
    defaultMessage: "Jour supprimé.",
    description: "06 § 5.2 — toast de succès d'une suppression de jour (R1 et R2)",
  },
  serviceUnavailable: {
    id: "staff.error.serviceUnavailable",
    defaultMessage: "Le service ne répond pas. Réessayez dans un instant.",
    description:
      "PLAN annexe F, D-14 — écriture collègue (ajout d'une personne compris) sans réponse",
  },
  dishNamePlaceholder: {
    id: "staff.dishForm.name.placeholder",
    defaultMessage: "Ex. salade César",
    description:
      "06 § 4.2, § 6.1 — exemple de nom d'un plat (ligne de « Ouvrir un jour » R2, ajout d'un plat)",
  },
  dishStockLabel: {
    id: "staff.dishForm.stock.label",
    defaultMessage: "Stock",
    description:
      "06 § 4.2, § 6.1 — stock d'un plat (en-tête des lignes de « Ouvrir un jour » R2, formulaire de plat)",
  },
  dishPriceLabel: {
    id: "staff.dishForm.price.label",
    defaultMessage: "Prix (optionnel)",
    description:
      "06 § 4.2, § 6.1 — prix d'un plat (en-tête des lignes de « Ouvrir un jour » R2, formulaire de plat)",
  },
  dishVoucherLabel: {
    id: "staff.dishForm.voucher.label",
    defaultMessage: "Ticket restaurant",
    description: "06 § 4.2-4.3, § 6.1 — case du plat payé par un ticket restaurant",
  },
  dishVoucherPricePlaceholder: {
    id: "staff.dishForm.price.voucherPlaceholder",
    defaultMessage: "Ticket",
    description: "06 § 4.3 — exemple du prix désactivé d'un plat au ticket restaurant",
  },
  dishZeroPrice: {
    id: "staff.dish.error.zeroPrice",
    defaultMessage: "Indiquez un prix supérieur à 0, ou laissez le champ vide.",
    description:
      "PLAN annexe F, D-22 — prix d'un plat à 0, négatif ou illisible (« Ouvrir un jour » R2, plats)",
  },
});
