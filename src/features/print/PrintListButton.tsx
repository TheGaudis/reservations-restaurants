import { FormattedMessage } from "react-intl";

import type { FullState, IsoDate, Restaurant } from "@/domain/types";
import { printListR1 } from "@/features/print/print-documents";
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

/** A chunk that fails to load (site updated meanwhile, network down) leaves the page as it was. */
async function printList(state: FullState, iso: IsoDate, opener: HTMLElement): Promise<void> {
  try {
    await printListR1(state, iso, opener);
  } catch (error) {
    console.error(error);
  }
}

/**
 * « Imprimer la liste » (btn small, print icon), before « Supprimer ce jour », on every open day, past ones included
 * (05 § 5.3). Prints document A of the R1 card; the R2 card has no button until document B exists (07 § 4).
 */
export function PrintListButton({ restaurant, iso }: PrintListButtonProps) {
  const state = useStaffState(whole);
  if (restaurant === "r2") return null;
  return (
    <Button
      size="small"
      onClick={(event) => {
        void printList(state, iso, event.currentTarget);
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
