import xs from "xstream";

import { updateAll } from "../../util";
import { ACHIEVEMENTS_UNLOCK_CONDITIONS, TIMEOUTS } from "../constant";

export default function makeAchievementsUpdateReducer(sources) {
  const unlockReducer$ = xs
    .periodic(1e3 * TIMEOUTS.unlockAchievements)
    .mapTo(state =>
      updateAll(
        state,
        Object.entries(ACHIEVEMENTS_UNLOCK_CONDITIONS)
          .filter(([, predicate]) => predicate(state))
          .map(([achievementKey]) => achievementKey)
          .map(achievementKey => [
            ["achievements", achievementKey],
            achievement => ({
              ...achievement,
              unlocked: true,
              unlockDate: Date.now()
            })
          ])
      )
    );
  return unlockReducer$;
}
