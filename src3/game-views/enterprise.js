import xs from "xstream";
import dropRepeats from "xstream/extra/dropRepeats";
import isolate from "@cycle/isolate";
import {
  button,
  br,
  div,
  h3,
  form,
  label,
  input,
  section,
  ul,
  li
} from "@cycle/dom";

import { GAME_UPDATE_UNLOCK_CONDITION, TIMEOUT, UPGRADES } from "../constant";
import { tabButtons } from "../shared";
import { ofWhich, set, range, update } from "../../util";
import { whole } from "../format";

function Enterprise(sources) {
  // const unlockedIndustries$ = sources.state.stream
  //   .map(state => state.upgrades)
  //   .compose(dropRepeats())
  //   .map(upgrades =>
  //     Object.keys(UPGRADES).filter(upgradeId => upgrades[upgradeId].unlocked)
  //   );

  // unlockedIndustries$.addListener({
  //   next: keys => {},
  //   error: console.error
  // });

  const dom$ = sources.state.stream
    .compose(dropRepeats((s1, s2) => s1.enterprise === s2.enterprise))
    .map(state => {
      const {
        enterprise: { currentIndustries }
      } = state;
      if (!currentIndustries) return null;
      return div([
        ul(
          currentIndustries.map(ci =>
            li([
              UPGRADES[ci.industryId].label,
              button(
                ".invest-industry",
                { dataset: { id: ci.industryId } },
                "Invest!"
              )
            ])
          )
        )
      ]);
    });

  const investAction$ = sources.DOM.select("button.invest-industry")
    .events("click")
    .map(e => e.ownerTarget.dataset.id);

  const reducer$ = investAction$.map(industryId => state =>
    set(state, ["enterprise", "currentIndustryInvestments", industryId], {})
  );

  return {
    DOM: dom$,
    state: reducer$
  };
}

export default isolate(Enterprise, { state: null });
