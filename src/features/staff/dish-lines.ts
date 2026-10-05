import { emptyDishDraft } from "@/domain/dishes";
import type { DishDraft } from "@/domain/dishes";

/** A dish line of « Ouvrir un jour » R2 in its form: the draft, and a key that follows the line when another one goes. */
export interface DishLine extends DishDraft {
  key: string;
}

let lastKey = 0;

/** A new empty line (06 § 4.2). */
export function newDishLine(): DishLine {
  lastKey += 1;
  return { ...emptyDishDraft(), key: `dish-line-${String(lastKey)}` };
}
