import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { useSessionStore } from "@/session/session";

// Stories of the staff mode: a staff session open with the password of the seed (parite.md § 2); the fake script of the
// story answers `getAdminState` with the full state.

/** `beforeEach` of a story: the staff session open, closed afterwards. */
export function staffSession(): () => void {
  const initial = useSessionStore.getState();
  useSessionStore.getState().open(SEED_PASSWORD);
  return () => {
    useSessionStore.setState(initial, true);
  };
}
