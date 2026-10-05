import { useMatch, useNavigate, useRouter } from "@tanstack/react-router";
import { useId, useRef } from "react";
import { defineMessages, useIntl } from "react-intl";

import { PasswordRejectedError } from "@/api/errors";
import { publicSearch } from "@/domain/navigation";
import type { PageSearchParams } from "@/domain/navigation";
import { LoginPanel } from "@/features/page/LoginPanel";
import { useLogin } from "@/mutations/login";
import { useIsFromCache } from "@/queries/use-app-state";
import { useSessionStore } from "@/session/session";
import { showToast } from "@/ui/feedback/toast";
import { focusOnMount, requestFocus } from "@/ui/pending-focus";
import { ViewToggle } from "@/ui/toggle/ViewToggle";

import styles from "@/features/page/ModeSwitch.module.css";

const messages = defineMessages({
  group: {
    id: "staff.modeSwitch.label",
    defaultMessage: "Mode d'accès",
    description: "06 § 1.1 — nom du groupe « Client / Collègue » de l'en-tête",
  },
  client: {
    id: "staff.modeSwitch.client",
    defaultMessage: "Client",
    description: "06 § 1.1 — segment du mode public",
  },
  staff: {
    id: "staff.modeSwitch.staff",
    defaultMessage: "Collègue",
    description: "06 § 1.1 — segment du mode collègue, qui ouvre le panneau de connexion",
  },
  loggedIn: {
    id: "staff.login.success",
    defaultMessage: "Mode collègue activé.",
    description: "06 § 1.3 (5) — toast de succès de la connexion",
  },
  failed: {
    id: "staff.login.error",
    defaultMessage: "Erreur de connexion. Réessayez.",
    description: "06 § 1.3 (6) — toast d'erreur de la connexion, sauf mot de passe refusé",
  },
  fromCache: {
    id: "staff.login.fromCache",
    defaultMessage: "Les données se chargent. Réessayez dans un instant.",
    description: "06 § 1.3 (1), 09 G-02 — connexion refusée tant que la copie locale est affichée",
  },
});

type Mode = "client" | "staff";

/** The password field takes the focus in a panel opened by « Collègue » (06 § 1.2), not in one reopened by a link. */
const PASSWORD_FOCUS = "login-password";

const takeFieldFocus = focusOnMount(PASSWORD_FOCUS, (input) => {
  input.focus();
});

/** Focuses the segment of `mode` (06 § 1.3 (5)): the switch stays mounted from / to /collegue. */
function focusSegment(box: HTMLElement | null, mode: Mode): void {
  box
    ?.querySelectorAll("button")
    .item(mode === "client" ? 0 : 1)
    .focus();
}

interface LoginSearch extends PageSearchParams {
  connexion?: boolean | undefined;
  retour?: string | undefined;
}

/** The chunk of the staff page loads while the script checks the password (R-31). */
async function preloadStaffPage(load: () => Promise<void> | undefined): Promise<void> {
  try {
    await load();
  } catch {
    // The navigation to /collegue loads it again.
  }
}

/**
 * Sends the password of the panel (06 § 1.3): refused on the copy of the last visit (G-02); on success the toast, then
 * `retour` (the URL kept by the guard of /collegue) or /collegue with the calendars (PLAN § 3.3.3); on failure the
 * script's « Mot de passe incorrect. » or « Erreur de connexion. Réessayez. ». The mutation forgets the password after.
 */
function useSubmitLogin(
  search: LoginSearch,
  focusStaff: () => void,
): (password: string) => Promise<void> {
  const intl = useIntl();
  const navigate = useNavigate();
  const router = useRouter();
  const fromCache = useIsFromCache();
  const login = useLogin();
  return async (password) => {
    if (fromCache) {
      showToast(intl.formatMessage(messages.fromCache), "error");
      return;
    }
    void preloadStaffPage(async () => router.loadRouteChunk(router.routesById["/collegue"]));
    try {
      await login.mutateAsync(password, {
        onSuccess: () => {
          showToast(intl.formatMessage(messages.loggedIn), "success");
          focusStaff();
          if (search.retour === undefined) {
            void navigate({ to: "/collegue", search: publicSearch(search), replace: true });
          } else {
            void navigate({ href: search.retour, replace: true });
          }
        },
      });
    } catch (error) {
      const refused = error instanceof PasswordRejectedError;
      showToast(refused ? error.message : intl.formatMessage(messages.failed), "error");
    } finally {
      login.reset();
    }
  };
}

/**
 * « Client / Collègue » and the login panel, on the right of the header (06 § 1.1-1.2, L-01). The panel is open while
 * `?connexion=true` on / (E-23); closing it empties the field and hides the password again (06 § 1.1). A busy
 * « Valider » replaces the veil (E-04). « Client » during a session logs out (06 § 1.5). Mounted once by the root,
 * it reads the search params of / only: elsewhere the panel stays closed.
 */
export function ModeSwitch() {
  const intl = useIntl();
  const navigate = useNavigate();
  const panelId = useId();
  const box = useRef<HTMLDivElement>(null);
  const loggedIn = useSessionStore((session) => session.password !== null);
  const search: LoginSearch =
    useMatch({ from: "/", shouldThrow: false, select: (match) => match.search }) ?? {};
  const open = search.connexion === true && !loggedIn;
  const submit = useSubmitLogin(search, () => {
    focusSegment(box.current, "staff");
  });

  const closePanel = () => {
    void navigate({
      to: "/",
      search: (previous) => ({ ...previous, connexion: undefined, retour: undefined }),
      replace: true,
    });
  };

  const choose = (mode: Mode) => {
    if (mode === "staff") {
      requestFocus(PASSWORD_FOCUS);
      void navigate({
        to: "/",
        search: (previous) => ({ ...previous, connexion: true }),
        replace: true,
      });
    } else if (loggedIn) {
      // The logout itself (purge, toast, back to /) belongs to background/logout.ts (PLAN § 3.3.4).
      focusSegment(box.current, "client");
      useSessionStore.getState().close("logout");
    } else {
      closePanel();
    }
  };

  // Back to the client mode, focus on « Client » (06 § 1.2).
  const escape = () => {
    focusSegment(box.current, "client");
    closePanel();
  };

  return (
    <div ref={box} className={styles["box"]}>
      <ViewToggle<Mode>
        aria-label={intl.formatMessage(messages.group)}
        className={styles["switch"]}
        value={loggedIn || open ? "staff" : "client"}
        onValueChange={choose}
        items={[
          { value: "client", label: intl.formatMessage(messages.client) },
          {
            value: "staff",
            label: intl.formatMessage(messages.staff),
            "aria-controls": panelId,
            "aria-expanded": open,
          },
        ]}
      />
      <div id={panelId} className={styles["panel"]} data-open={open || undefined} inert={!open}>
        {open ? <LoginPanel submit={submit} onEscape={escape} takeFocus={takeFieldFocus} /> : null}
      </div>
    </div>
  );
}
