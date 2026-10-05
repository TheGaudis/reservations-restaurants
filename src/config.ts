// Deployment URL of Code.gs, read at build time (.env.development, .env.test, repository variable in CI).
export const APPS_SCRIPT_URL: string = import.meta.env.VITE_APPS_SCRIPT_URL ?? "";

const APPS_SCRIPT_URL_PATTERN = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/u;

/** G-05, D-05, a-25: URL absent, not shaped like a deployment URL, or still the COLLE_ICI placeholder. */
export function isConfigMissing(url: string = APPS_SCRIPT_URL): boolean {
  return !APPS_SCRIPT_URL_PATTERN.test(url) || url.includes("COLLE_ICI");
}

/** `pnpm dev` runs on the fake script (msw); the production build drops this branch. */
export const USE_MOCK_API: boolean = import.meta.env.DEV && import.meta.env.VITE_MOCK_API === "1";
