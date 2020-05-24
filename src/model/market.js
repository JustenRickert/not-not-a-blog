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

const NEW_MARKET_TIMEOUT = 60e3;
const MARKET_GROWTH_TIMEOUT = 5e3;

// TODO need to add back the `withEmpties` part of this method. Want something
// that returns a minimum of 1, and a maximum of ... something
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
    console.log({ keysPaths, costObject, industryKey, state });
    return keysPaths.every(kp => get(state, kp) >= get(costObject, kp));
  });

export default function market(sources) {
  const marketGrowthReducer$ = xs
    .merge(
      ...Object.keys(INDUSTRIES).map(key =>
        roughlyPeriodic(
          sources.time.createOperator,
          MARKET_GROWTH_TIMEOUT
        ).mapTo(key)
      )
    )
    .map(key => state => {
      const industry = get(state, ["industry", key]);
      const { productionRate } = INDUSTRIES[key]; // TODO: need this?
      const delta = productionRate * leaningOffset(0.1, 0.9) * industry.stock;
      return update(state, ["industry", key, "supply"], s =>
        Math.max(0, s + delta)
      );
    });

  const randomNewMarket = state => {
    const markets = Object.keys(INDUSTRIES)
      .map(key => {
        const costs = meetableResourceRequirements(state, key);
        return {
          key,
          offset: offset(0.5),
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

  const randomNewMarketReducer$ = sources.state.stream
    .take(1)
    .map(state => {
      let reducer$ = roughlyPeriodic(
        sources.time.createOperator,
        NEW_MARKET_TIMEOUT
      ).mapTo(randomNewMarket);
      if (!state.markets) reducer$ = reducer$.startWith(randomNewMarket);
      return reducer$;
    })
    .flatten();

  return xs.merge(randomNewMarketReducer$, marketGrowthReducer$);
}
