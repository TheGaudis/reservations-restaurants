import { defineMessages } from "react-intl";

// Texts shared by several files. Texts used by one file stay in that file (PLAN § 3.10).
export const commonMessages = defineMessages({
  cancel: {
    id: "common.action.cancel",
    defaultMessage: "Annuler",
    description: "00 § 2.3 — bouton de fermeture d'un formulaire",
  },
});
