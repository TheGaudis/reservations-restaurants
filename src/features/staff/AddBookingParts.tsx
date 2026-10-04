import { usePageNavigate, usePageSearch } from "@/features/calendar/page-search";
import { addButtonId, addFormId, addFormTarget } from "@/features/staff/add-booking";
import { intl } from "@/intl/intl";
import { staffCommonMessages } from "@/intl/staff-messages";
import { Button } from "@/ui/button/Button";
import { requestFocus } from "@/ui/pending-focus";

// Parts shared by the R1 and R2 forms « Ajouter une personne » (06 § 8).

interface AddPersonButtonProps {
  /** Value of `ajout` that the button opens (`r1`, `r2:{dish id}`). */
  ajout: string;
}

/**
 * « + Ajouter une personne » (small, 06 § 8): opens its form in `push`, focus on « Nom et prénom » (04 § 5.1). Stays in
 * the page while the form is open (`aria-expanded`, 05 § 5.3), and takes the focus back when it closes (E-48). A second
 * click leaves the open form as it is.
 */
export function AddPersonButton({ ajout }: AddPersonButtonProps) {
  const search = usePageSearch();
  const navigate = usePageNavigate();
  const open = search.ajout === ajout;
  return (
    <Button
      id={addButtonId(ajout)}
      size="small"
      aria-expanded={open}
      aria-controls={open ? addFormId(ajout) : undefined}
      onClick={() => {
        if (open) return;
        requestFocus(addFormTarget(ajout));
        navigate({ ...search, ajout }, { replace: false });
      }}
    >
      {intl.formatMessage(staffCommonMessages.addPerson)}
    </Button>
  );
}
