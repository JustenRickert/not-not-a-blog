import xs from "xstream";
import delay from "xstream/extra/delay";

import { GAME_UPDATE_UNLOCK_CONDITION, TIMEOUT, UPGRADES } from "../constant";
import { ofWhich, set, range, setAll } from "../../util";
import roughlyPeriodic from "../roughly-periodic";

const ENTERPRISE_TIMEOUT = 5e3;

const sampleWithEmptiesWithoutReplacement = (xs, count) => {
  const result = [];
  const ys = xs.slice().concat(range(count).map(() => null));
  range(count).forEach(() => {
    const index = Math.floor(Math.random() * ys.length);
    result.push(ys.splice(index, 1)[0]);
  });
  return result.filter(Boolean);
};

export default function makeEnterpriseReducer(sources) {
  const reducer = state => {
    const unlockedIndustries = Object.keys(UPGRADES).filter(
      upgradeId => state.upgrades[upgradeId].unlocked
    );
    const randomIndustries = sampleWithEmptiesWithoutReplacement(
      unlockedIndustries,
      5
    );
    console.log("REDUCED");
    return setAll(state, [
      [
        "enterprise.currentIndustries",
        randomIndustries.map(industryId => ({
          industryId
        }))
      ],
      ["enterprise.lastIndustriesUpdate", Date.now()]
    ]);
  };

  const period$ = sources.state.stream
    .take(1)
    .map(state => {
      const _period$ = roughlyPeriodic(
        sources.Time.createOperator,
        ENTERPRISE_TIMEOUT
      );
      if (state.enterprise.lastIndustriesUpdate) {
        const now = Date.now();
        const sinceLast = now - state.enterprise.lastIndustriesUpdate;
        const _delay = delay(Math.max(0, ENTERPRISE_TIMEOUT - sinceLast));
        return xs.merge(
          xs.of(reducer).compose(_delay),
          _period$.compose(_delay).mapTo(reducer)
        );
      }
      return _period$.startWith(reducer).mapTo(reducer);
    })
    .flatten();

  return period$;
}
