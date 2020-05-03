import xs from "xstream";
import {
  div,
  section,
  button,
  h1,
  h2,
  h3,
  p,
  h4,
  a,
  ul,
  li,
  span,
  nav
} from "@cycle/dom";

import {
  ACHIEVEMENTS_LABELS,
  ACHIEVEMENTS_UNLOCK_CONDITIONS,
  TIMEOUTS
} from "./constant";
import sampleCombine from "xstream/extra/sampleCombine";
import { setAll, updateAll } from "../util";

function makeUpdateState(sources) {
  const unlockReducer$ = xs
    .periodic(1e3 * TIMEOUTS.unlockAchievements)
    .compose(sampleCombine(sources.state.stream))
    .map(([, state]) =>
      Object.entries(ACHIEVEMENTS_UNLOCK_CONDITIONS)
        .filter(([, predicate]) => predicate(state))
        .map(([achievementKey]) => achievementKey)
    )
    .map(unlockedAchievements => state =>
      updateAll(
        state,
        unlockedAchievements.map(achievementKey => [
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

export default function Achievements(sources) {
  const achievements$ = sources.state.stream.map(state => state.achievements);

  const dom$ = achievements$.map(achievements =>
    section(
      Object.entries(achievements).map(([achievementKey, achievement]) =>
        div([
          h4(ACHIEVEMENTS_LABELS[achievementKey]),
          p(achievement.unlocked ? "ACHIEVED" : "LOCKED")
        ])
      )
    )
  );

  const reducer$ = makeUpdateState(sources);

  return {
    DOM: dom$,
    state: reducer$
  };
}
