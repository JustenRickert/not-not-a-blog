import xs from "xstream";

import {
  allKeyPaths,
  get,
  range,
  set,
  offset,
  leaningOffset,
  update
} from "../../util";
import { INDUSTRIES } from "../constant";
import roughlyPeriodic from "../roughly-periodic";

const sampleWithEmptiesWithoutReplacement = (xs, count) => {
  const result = [];
  const ys = xs.slice();
  range(count).forEach(() => {
    const index = Math.floor(Math.random() * ys.length);
    result.push(ys.splice(index, 1)[0]);
  });
  return result.filter(Boolean);
};

const meetableResourceRequirements = (state, industryKey) =>
  INDUSTRIES[industryKey].from.filter(costObject => {
    const keysPaths = allKeyPaths(costObject);
    return keysPaths.every(kp => get(state, kp) >= get(costObject, kp));
  });

export default function market(sources) {
  const marketGrowthReducer$ = xs
    .merge(
      ...Object.keys(INDUSTRIES).map(key =>
        roughlyPeriodic(sources.time.createOperator, 5e3).mapTo(key)
      )
    )
    .map(key => state =>
      update(
        state,
        ["industry", key, "supply"],
        s => s * (1 + leaningOffset(0.1, 0.01))
      )
    );

  const randomNewMarket = state => {
    const markets = Object.keys(INDUSTRIES)
      .map(key => {
        const costs = meetableResourceRequirements(state, key);
        return {
          key,
          offset: offset(0.25),
          costs
        };
      })
      .filter(m => m.costs.length);
    return set(
      state,
      "markets",
      sampleWithEmptiesWithoutReplacement(markets, markets.length * 2)
    );
  };

  const randomNewMarketReducer$ = roughlyPeriodic(
    sources.time.createOperator,
    60e3
  )
    .mapTo(randomNewMarket)
    .startWith(randomNewMarket);

  return xs.merge(randomNewMarketReducer$, marketGrowthReducer$);
}
