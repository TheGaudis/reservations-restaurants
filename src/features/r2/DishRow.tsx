import type { ReactNode } from "react";
import { defineMessages, useIntl } from "react-intl";

import { capacityClass } from "@/domain/capacity";
import { gaugePercent } from "@/domain/gauge";
import type { Dish } from "@/domain/types";
import { dishPriceText, withPrice } from "@/intl/amounts";
import { commonMessages } from "@/intl/common-messages";
import { CapacityPill } from "@/ui/feedback/CapacityPill";

import styles from "@/features/r2/DishRow.module.css";

const messages = defineMessages<{ stock: { remaining: string; stock: string } }>({
  stock: {
    id: "public.r2.dish.stock",
    defaultMessage: "{remaining} / {stock}",
    description:
      "05 § 4.5, § 6.3 — jauge d'un plat (« 4 / 10 », portions restantes sur le stock, sans unité)",
  },
});

interface DishRowProps {
  dish: Dish;
  /** Portions left: stock minus portions booked, negative when the stock was lowered (01 § 3.2). */
  remaining: number;
  /** Day before today: muted name, gauge without its colour (05 § 4.2, E-56). */
  past: boolean;
  /** Staff actions, forms and bookings of the dish (06 § 6-8, P5). */
  children?: ReactNode;
}

/**
 * Line of a dish on the R2 card (`.item-row.stacked`, 05 § 6.3): « Lasagnes␣— 4,50 € », « Bowl␣— prix d'un ticket
 * restaurant » or the name alone, and its stock gauge; a dish without portions left says « Épuisé » (D-02).
 */
export function DishRow({ dish, remaining, past, children }: DishRowProps) {
  const intl = useIntl();
  return (
    <div className={styles["row"]} data-past={past || undefined}>
      <div className={styles["head"]}>
        <span className={styles["name"]}>{withPrice(dish.name, dishPriceText(dish))}</span>
        <span className={styles["gauge"]}>
          <CapacityPill
            percent={gaugePercent(remaining, dish.stock)}
            state={capacityClass(remaining, dish.stock)}
            fullLabel={intl.formatMessage(commonMessages.soldOut)}
          >
            {intl.formatMessage(messages.stock, {
              remaining: String(remaining),
              stock: String(dish.stock),
            })}
          </CapacityPill>
        </span>
      </div>
      {children}
    </div>
  );
}
