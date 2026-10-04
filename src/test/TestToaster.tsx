import { useRef } from "react";

import { Toaster } from "@/ui/feedback/Toaster";

/** Toasts of a test, in an element of their own as in __root.tsx (`container`, journal p4a decision 7). */
export function TestToaster() {
  const container = useRef<HTMLDivElement>(null);
  return (
    <>
      <div ref={container} />
      <Toaster container={container} />
    </>
  );
}
