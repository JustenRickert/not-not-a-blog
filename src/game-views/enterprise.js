import xs from "xstream";
import dropRepeats from "xstream/extra/dropRepeats";
import isolate from "@cycle/isolate";
import { button, br, div, h3, form, label, input, section } from "@cycle/dom";

import { GAME_UPDATE_UNLOCK_CONDITION, TIMEOUT, UPGRADES } from "../constant";
import { tabButtons } from "../shared";
import { ofWhich, set, range } from "../../util";
import { whole } from "../format";

function Enterprise(sources) {
  const unlockedIndustries$ = sources.state.stream
    .map(state => state.upgrades)
    .compose(dropRepeats())
    .map(upgrades =>
      Object.keys(UPGRADES).filter(upgradeId => upgrades[upgradeId].unlocked)
    );

  unlockedIndustries$.addListener({
    next: keys => {},
    error: console.error
  });

  console.log(sources);

  const dom$ = sources.state.stream.map(state => {
    return div("hella");
  });

  return {
    DOM: dom$
  };
}

export default isolate(Enterprise, { state: null });
