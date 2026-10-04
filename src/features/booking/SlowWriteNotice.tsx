import type { Ref } from "react";
import { useIntl } from "react-intl";

import { commonMessages } from "@/intl/common-messages";

import styles from "@/features/booking/SlowWriteNotice.module.css";

interface SlowWriteNoticeProps {
  /** `slow` of `useSlowWrite`. */
  slow: boolean;
  /** `clearOnUnmount` of `useSlowWrite`. */
  timerRef: Ref<HTMLOutputElement>;
}

/**
 * Under the busy button after 20 s (D-15, E-10), in a live region present from the start so that the text is read
 * when it appears.
 */
export function SlowWriteNotice({ slow, timerRef }: SlowWriteNoticeProps) {
  const intl = useIntl();
  return (
    <output ref={timerRef} className={styles["notice"]}>
      {slow ? intl.formatMessage(commonMessages.slowWrite) : null}
    </output>
  );
}
