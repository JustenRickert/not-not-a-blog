import xs from "xstream";

import {
  allKeyPaths,
  get,
  sample,
  takeRight,
  offset,
  leaningOffset,
  update
} from "../../util";
import { INDUSTRIES } from "../constant";
import roughlyPeriodic from "../roughly-periodic";

const MAX_MARKET_TRADES = 10;
const NEW_MARKET_TIMEOUT = 30e3;
const MARKET_GROWTH_TIMEOUT = 5e3;

const meetableResourceRequirements = (state, industryKey) =>
  INDUSTRIES[industryKey].from.filter(costObject => {
    const keysPaths = allKeyPaths(costObject);
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
      const { productionRate } = INDUSTRIES[key];
      const delta = productionRate * leaningOffset(0.5, 0.25) * industry.stock;
      return update(state, ["industry", key, "supply"], s =>
        Math.max(0, s + delta)
      );
    });

  const randomNewMarket = state => {
    if (state.market.length >= MAX_MARKET_TRADES) return state;
    const investableMarkets = Object.keys(INDUSTRIES)
      .map(key => {
        const costs = meetableResourceRequirements(state, key);
        return {
          key,
          costs
        };
      })
      .filter(m => m.costs.length);
    if (!investableMarkets.length) return state;
    const newMarket = sample(investableMarkets);
    const newCost = sample(newMarket.costs);
    return update(state, "market", ms =>
      takeRight(
        ms.concat({
          key: newMarket.key,
          offset: offset(0.5),
          cost: newCost
        }),
        MAX_MARKET_TRADES
      )
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
