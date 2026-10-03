// After a staff session closes (PLAN § 3.3.4, steps 2 to 6; corrects a-1, a-13, a-14). Step 1 is
// `session.close(reason)`; step 3 needs nothing: `useAppState()` falls back to ['state','public'], always cached.
import { defineMessages } from "react-intl";

import { currentSearch } from "@/background/deps";
import type { BackgroundDeps, ToastType } from "@/background/deps";
import { CALENDAR_KEYS } from "@/domain/navigation";
import { intl } from "@/intl/intl";
import { stateKeys } from "@/queries/state";
import type { SessionEnd } from "@/session/session";

const messages = defineMessages({
  logout: {
    id: "staff.session.logout",
    defaultMessage: "Retour au mode client.",
    description: "06 § 1.5 — toast après un clic sur « Client »",
  },
  inactivity: {
    id: "staff.session.inactivity",
    defaultMessage: "Déconnecté du mode collègue après 10 minutes d'inactivité.",
    description: "06 § 1.6 — toast de la déconnexion automatique",
  },
  passwordChanged: {
    id: "staff.session.passwordChanged",
    defaultMessage: "Le mot de passe du mode collègue a changé. Reconnectez-vous.",
    description:
      "06 § 1.7 — toast d'erreur quand le script refuse le mot de passe pendant une session",
  },
});

function toastOf(reason: SessionEnd): { message: string; type: ToastType } {
  switch (reason) {
    case "logout": {
      return { message: intl.formatMessage(messages.logout), type: "neutral" };
    }
    case "inactivity": {
      return { message: intl.formatMessage(messages.inactivity), type: "neutral" };
    }
    case "password-changed": {
      return { message: intl.formatMessage(messages.passwordChanged), type: "error" };
    }
  }
}

export function afterLogout(deps: BackgroundDeps, reason: SessionEnd | null): void {
  const { queryClient, router } = deps;
  // 2. Names, contacts and the variables of past writes leave the cache, without waiting for the network.
  deps.purgeStaffSession(queryClient);
  // 4. The public state shown again is read again, with `since`.
  void queryClient.invalidateQueries({ queryKey: stateKeys.public() });
  // 5.
  if (reason !== null) {
    const toast = toastOf(reason);
    deps.showToast(toast.message, toast.type);
  }
  // 6. Leaving /collegue unmounts every staff panel and form; going there directly keeps the guard from reopening
  // the login panel after a wanted logout. The calendars stay (the keys `publicSearch` keeps).
  if (router.state.location.pathname.startsWith("/collegue")) {
    const search = currentSearch(router);
    const calendars = Object.fromEntries(CALENDAR_KEYS.map((key) => [key, search[key]]));
    void router.navigate({ to: "/", search: calendars, replace: true });
  } else {
    void router.invalidate();
  }
}

/** Runs `afterLogout` each time the session goes from open to closed. Returns the stop. */
export function watchLogout(deps: BackgroundDeps): () => void {
  return deps.session.subscribe(
    (s) => s.password !== null,
    (loggedIn) => {
      if (!loggedIn) afterLogout(deps, deps.session.getState().endReason);
    },
  );
}
