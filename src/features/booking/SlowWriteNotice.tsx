import { FormattedMessage } from "react-intl";

import styles from "@/features/booking/SlowWriteNotice.module.css";

interface SlowWriteNoticeProps {
  /** `slow` of `useSlowWrite`. */
  slow: boolean;
}

/**
 * Under the busy button after 20 s (D-15, E-10), in a live region present from the start so that the text is read
 * when it appears.
 */
export function SlowWriteNotice({ slow }: SlowWriteNoticeProps) {
  return (
    <output className={styles["notice"]}>
      {slow ? (
        <FormattedMessage
          id="common.write.slow"
          defaultMessage="Le service met du temps à répondre. Gardez cette page ouverte : la confirmation s'affichera ici."
          description="PLAN annexe F, D-15 — sous le bouton occupé après 20 s, public et collègue"
        />
      ) : null}
    </output>
  );
}
