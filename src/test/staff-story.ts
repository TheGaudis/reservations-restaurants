import { clockAt } from "@/test/story-router";
import { staffSession } from "@/test/story-session";

// `beforeEach` of the stories of the staff panels and cards: the site's clock at TEST_NOW and the staff session of the
// seed open (parite.md § 2), both put back afterwards.

export function staffStory(): () => void {
  const restoreClock = clockAt()();
  const closeSession = staffSession();
  return () => {
    closeSession();
    restoreClock();
  };
}
