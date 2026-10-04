import type { ReactNode } from "react";
import { RawIntlProvider } from "react-intl";

import { intl } from "@/intl/intl";

interface PrintRootProps {
  /** The printed document, built from a snapshot of the data at the click (PLAN § 3.8). */
  children: ReactNode;
}

/**
 * Content of `.print-root`, the React root that `printDocument` creates at each printing. That root sits outside the
 * router's tree: it gets the single `intl` instance here, and the document gets its data as props.
 */
export function PrintRoot({ children }: PrintRootProps) {
  return <RawIntlProvider value={intl}>{children}</RawIntlProvider>;
}
