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

  return {
    DOM: dom$
  };
}
