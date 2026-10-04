import type { ReactNode } from "react";

import type { Restaurant } from "@/domain/types";

import styles from "@/features/page/Column.module.css";

interface ColumnProps {
  restaurant: Restaurant;
  title: string;
  description: string;
  /** Calendar and day card, or their skeleton. */
  children: ReactNode;
}

/** Column of a restaurant (05 § 1, 08 § 7.3): accent, name with its oblique mark, description, then its content. */
export function Column({ restaurant, title, description, children }: ColumnProps) {
  return (
    <section className={styles["column"]} data-accent={restaurant}>
      <h2 className={styles["title"]}>{title}</h2>
      <p className={styles["description"]}>{description}</p>
      {children}
    </section>
  );
}
