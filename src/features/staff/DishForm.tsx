import type { Dish, IsoDate } from "@/domain/types";

// Slots of the R2 staff card for the dishes (06 § 6, D-19, D-21, D-22, C-20 to C-22, C-14). Empty until P5 (c).

/** « Modifier ce plat » and « Supprimer ce plat », after « + Ajouter une personne » in the dish actions (05 § 6.3). */
export function DishActions(_props: { dish: Dish }) {
  return null;
}

/** Form « Modifier ce plat », under the form « Ajouter une personne » of the dish; open while `editPlat={dish id}`. */
export function EditDishForm(_props: { dish: Dish }) {
  return null;
}

/** « + Ajouter un plat à ce jour », or its form while `ajoutPlat=true`, under the dish list (05 § 6.2). */
export function AddDish(_props: { iso: IsoDate }) {
  return null;
}
