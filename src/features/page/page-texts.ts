import { defineMessages, useIntl } from "react-intl";

import type { Restaurant, Settings } from "@/domain/types";
import { readFallbackTexts } from "@/queries/local-cache";
import type { FallbackTexts } from "@/queries/local-cache";
import { useLoadedAppState } from "@/queries/use-app-state";

// Names and descriptions of the two restaurants, shown in the header and the columns (04 § 2, 05 § 1).

const messages = defineMessages({
  name1: {
    id: "common.page.defaultName1",
    defaultMessage: "Restaurant Pédagogique",
    description: "04 § 2, 05 § 1, 01 § 4.1 — nom du restaurant 1 avant toute donnée",
  },
  name2: {
    id: "common.page.defaultName2",
    defaultMessage: "Aristide",
    description: "04 § 2, 05 § 1, 01 § 4.1 — nom du restaurant 2 avant toute donnée",
  },
  desc1: {
    id: "common.page.defaultDesc1",
    defaultMessage: "Table réservée par nombre de couverts, avec le menu du jour.",
    description: "01 § 4.1, 03 § 2.2 — description du restaurant 1 avant toute donnée",
  },
  desc2: {
    id: "common.page.defaultDesc2",
    defaultMessage: "Plats à emporter ou sur place, chacun avec son propre stock.",
    description: "01 § 4.1, 03 § 2.2 — description du restaurant 2 avant toute donnée",
  },
});

export type PageTexts = Pick<Settings, "name1" | "name2" | "desc1" | "desc2">;

/** Title and description of the column of `restaurant` (05 § 1). */
export function columnTexts(texts: PageTexts, restaurant: Restaurant) {
  return restaurant === "r1"
    ? { title: texts.name1, description: texts.desc1 }
    : { title: texts.name2, description: texts.desc2 };
}

/** An empty value is never applied: the default stays (04 § 2, `renderTexts`). */
function withDefaults(texts: FallbackTexts | null, defaults: PageTexts): PageTexts {
  const pick = (key: keyof PageTexts) => {
    const value = texts?.[key];
    return value === undefined || value === "" ? defaults[key] : value;
  };
  return { name1: pick("name1"), name2: pick("name2"), desc1: pick("desc1"), desc2: pick("desc2") };
}

/** Names before any data, also those of the prerendered shell (G-01, 01 § 4.1). */
export function useDefaultTexts(): PageTexts {
  const intl = useIntl();
  return {
    name1: intl.formatMessage(messages.name1),
    name2: intl.formatMessage(messages.name2),
    desc1: intl.formatMessage(messages.desc1),
    desc2: intl.formatMessage(messages.desc2),
  };
}

/**
 * Texts before any data (G-01): the titles stored by the old site at the last visit (`reservations-textes`, 03 § 1.2,
 * E-18), otherwise the defaults. Reads the storage: render it inside `BrowserOnly` or a route.
 */
export function useSkeletonTexts(): PageTexts {
  return withDefaults(readFallbackTexts(), useDefaultTexts());
}

/** Texts of the page: the settings of the state shown (local copy or script), otherwise those of the skeleton. */
export function usePageTexts(): PageTexts {
  const settings = useLoadedAppState((state) => state.settings);
  const skeleton = useSkeletonTexts();
  return settings === undefined ? skeleton : withDefaults(settings, skeleton);
}
