import { setupWorker } from "msw/browser";

import { handlers } from "@/mocks/apps-script";

export const worker = setupWorker(...handlers);
