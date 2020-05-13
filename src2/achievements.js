import { div, section, p, h4 } from "@cycle/dom";

import { ACHIEVEMENTS_LABELS } from "./constant";

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
