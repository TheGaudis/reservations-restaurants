import { Suspense, use } from "react";
import type { ReactNode } from "react";
import { browser } from "react-dom";

function BrowserGate({ children }: { children: ReactNode }): ReactNode {
  use(browser());
  return children;
}

interface BrowserOnlyProps {
  /** What the prerendered shell holds in its place: markup that reads nothing of the browser. */
  fallback: ReactNode;
  /** What may read the URL, the session, the local copy or the clock. */
  children: ReactNode;
}

/**
 * Part of the root that reads the browser (PLAN § 2.1, arbitrage 16). The shell is prerendered once, in Node: there,
 * `use(browser())` gives up the boundary and the shell holds `fallback`, marked « rendered by the client ». In the
 * browser, `use(browser())` never suspends: React renders `children` in place of `fallback` without hydrating them,
 * so nothing they read can mismatch the shell (React error #418).
 */
export function BrowserOnly({ fallback, children }: BrowserOnlyProps) {
  return (
    <Suspense fallback={fallback}>
      <BrowserGate>{children}</BrowserGate>
    </Suspense>
  );
}
