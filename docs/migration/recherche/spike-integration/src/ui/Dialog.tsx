import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import type { ReactNode } from "react";
import { FormattedMessage } from "react-intl";

interface DialogProps {
  trigger: ReactNode;
  title: ReactNode;
  children: ReactNode;
}

export function Dialog({ trigger, title, children }: DialogProps) {
  return (
    <BaseDialog.Root>
      <BaseDialog.Trigger className="button">{trigger}</BaseDialog.Trigger>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="backdrop" />
        <BaseDialog.Popup className="popup">
          <BaseDialog.Title>{title}</BaseDialog.Title>
          {children}
          <BaseDialog.Close className="button">
            <FormattedMessage
              id="common.action.close"
              defaultMessage="Fermer"
              description="bouton de fermeture d'une fenêtre"
            />
          </BaseDialog.Close>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
