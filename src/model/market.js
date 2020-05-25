import xs from "xstream";

import {
  allKeyPaths,
  get,
  sample,
  drop,
  takeRight,
  product,
  offset,
  update,
  withRandomOffset
} from "../../util";
import { INDUSTRIES } from "../constant";
import roughlyPeriodic from "../roughly-periodic";

const MAX_MARKET_TRADES = 10;
const NEW_MARKET_TIMEOUT = 30e3;
const MARKET_GROWTH_TIMEOUT = 5e3;

const meetableResourceRequirements = (state, industryKey) =>
  INDUSTRIES[industryKey].from.filter(costObject => {
    const keyPaths = allKeyPaths(costObject);
    return keyPaths.every(kp => get(state, kp) >= get(costObject, kp));
  });

function industryProductionMultiplier(industryKey, state) {
  const { productionMultiplier } = INDUSTRIES[industryKey];
  if (!productionMultiplier?.industry) return 1;
  return product(
    Object.entries(productionMultiplier.industry),
    ([key, m]) => state.industry[key].stock * m
  );
}

export default function market(sources) {
  const marketGrowthReducer$ = xs
    .merge(
      ...Object.keys(INDUSTRIES).map(key =>
        roughlyPeriodic(MARKET_GROWTH_TIMEOUT).map(since => ({ since, key }))
      )
    )
    .map(({ since, key }) => state => {
      const industry = get(state, ["industry", key]);
      const { productionRate } = INDUSTRIES[key];
      const multiplier = industryProductionMultiplier(key, state);
      const delta =
        multiplier *
        productionRate *
        industry.stock *
        withRandomOffset(since / MARKET_GROWTH_TIMEOUT, 0.25);
      return update(state, ["industry", key, "supply"], s =>
        Math.max(0, s + delta)
      );
    });

  const randomNewMarket = state => {
    if (state.market.length >= MAX_MARKET_TRADES)
      state = update(state, "market", ms => drop(ms, 1));
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
      let reducer$ = roughlyPeriodic(NEW_MARKET_TIMEOUT).mapTo(randomNewMarket);
      if (!state.market) reducer$ = reducer$.startWith(randomNewMarket);
      return reducer$;
    })
    .flatten();

  return xs.merge(randomNewMarketReducer$, marketGrowthReducer$);
}
