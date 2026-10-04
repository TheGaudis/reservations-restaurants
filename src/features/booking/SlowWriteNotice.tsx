import { useIntl } from "react-intl";

import { commonMessages } from "@/intl/common-messages";

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
  const intl = useIntl();
  return (
    <output className={styles["notice"]}>
      {slow ? intl.formatMessage(commonMessages.slowWrite) : null}
    </output>
  );
}
