import { FormattedMessage } from "react-intl";

import type { FullState, IsoDate, Restaurant } from "@/domain/types";
import { printListR1, printListR2, startPrinting } from "@/features/print/print-documents";
import { useStaffState } from "@/features/staff/use-staff-state";
import { Button } from "@/ui/button/Button";
import { PrintIcon } from "@/ui/icons";

// Slot of both staff cards for « Imprimer la liste » (05 § 5.3, § 6.2, 07 § 1, I-01, I-02).

interface PrintListButtonProps {
  restaurant: Restaurant;
  /** Selected day of the card. */
  iso: IsoDate;
}

const whole = (state: FullState): FullState => state;

/**
 * « Imprimer la liste » (btn small, print icon), before « Supprimer ce jour », on every open day, past ones included
 * (05 § 5.3, § 6.2). Prints document A (R1 card) or document B (R2 card) of the selected day (07 § 3, § 4).
 */
export function PrintListButton({ restaurant, iso }: PrintListButtonProps) {
  const state = useStaffState(whole);
  return (
    <Button
      size="small"
      onClick={(event) => {
        void startPrinting(
          restaurant === "r1" ? printListR1 : printListR2,
          state,
          iso,
          event.currentTarget,
        );
      }}
    >
      <PrintIcon />
      <FormattedMessage
        id="staff.print.list"
        defaultMessage="Imprimer la liste"
        description="05 § 5.3, § 6.2, 07 § 1 — bouton de la fiche collègue qui imprime la liste du jour"
      />
    </Button>
  );
}
