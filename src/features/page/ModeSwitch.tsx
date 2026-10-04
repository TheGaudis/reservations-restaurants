import { useNavigate, useRouter, useSearch } from "@tanstack/react-router";
import { useId } from "react";
import { defineMessages, useIntl } from "react-intl";

import { PasswordRejectedError } from "@/api/errors";
import { publicSearch } from "@/domain/navigation";
import type { PageSearchParams } from "@/domain/navigation";
import { loginPanelChunk, useChunk } from "@/features/page/lazy-chunks";
import type { LoginPanelProps } from "@/features/page/LoginPanel";
import { useLogin } from "@/mutations/login";
import { useIsFromCache } from "@/queries/use-app-state";
import { useSessionStore } from "@/session/session";
import { showToast } from "@/ui/feedback/toast";
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

/**
 * Segment that takes the focus when the next mode switch mounts: « Collègue » after a login, « Client » after a click
 * on « Client » (06 § 1.3 (5)). The page under the other route mounts a new switch.
 */
let pendingFocus: Mode | null = null;

/** Ref callback of the switch, stable: React calls it when a switch mounts, never on a new render. */
function takePendingFocus(element: HTMLElement | null): void {
  if (element === null || pendingFocus === null) return;
  element
    .querySelectorAll("button")
    .item(pendingFocus === "client" ? 0 : 1)
    .focus();
  pendingFocus = null;
}

/** The field of a panel opened by « Collègue » takes the focus (06 § 1.2), not one reopened by a link. */
let focusPasswordField = false;

/** Ref callback of the password field, stable like `takePendingFocus`. */
function takeFieldFocus(input: HTMLInputElement | null): void {
  if (input === null || !focusPasswordField) return;
  focusPasswordField = false;
  input.focus();
}

interface LoginSearch extends PageSearchParams {
  connexion?: boolean | undefined;
  retour?: string | undefined;
}

/** The login panel once its chunk is there (TanStack Form and the fields stay out of the initial path, S3). */
function LoginPanelSlot(props: Omit<LoginPanelProps, "takeFocus">) {
  const module = useChunk(loginPanelChunk);
  if (module === null) return null;
  return <module.LoginPanel {...props} takeFocus={takeFieldFocus} />;
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
function useSubmitLogin(search: LoginSearch): (password: string) => Promise<void> {
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
          pendingFocus = "staff";
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
 * `?connexion=true` (E-23); closing it empties the field and hides the password again (06 § 1.1). A busy « Valider »
 * replaces the veil (E-04). « Client » during a session logs out (06 § 1.5).
 */
export function ModeSwitch() {
  const intl = useIntl();
  const navigate = useNavigate();
  const panelId = useId();
  const loggedIn = useSessionStore((session) => session.password !== null);
  const search: LoginSearch = useSearch({ strict: false });
  const open = search.connexion === true && !loggedIn;
  const submit = useSubmitLogin(search);

  const closePanel = () => {
    void navigate({
      to: ".",
      search: (previous) => ({ ...previous, connexion: undefined, retour: undefined }),
      replace: true,
    });
  };

  const choose = (mode: Mode) => {
    if (mode === "staff") {
      focusPasswordField = true;
      loginPanelChunk.load();
      void navigate({
        to: ".",
        search: (previous) => ({ ...previous, connexion: true }),
        replace: true,
      });
    } else if (loggedIn) {
      // The logout itself (purge, toast, back to /) belongs to background/logout.ts (PLAN § 3.3.4).
      pendingFocus = "client";
      useSessionStore.getState().close("logout");
    } else {
      closePanel();
    }
  };

  // Back to the client mode, focus on « Client » (06 § 1.2): the first segment of this switch.
  const escape = (input: HTMLInputElement) => {
    input.closest(`.${styles["box"]}`)?.querySelector("button")?.focus();
    closePanel();
  };

  return (
    <div ref={takePendingFocus} className={styles["box"]}>
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
        {open ? <LoginPanelSlot submit={submit} onEscape={escape} /> : null}
      </div>
    </div>
  );
}
