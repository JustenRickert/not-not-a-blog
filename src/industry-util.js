import xs from "xstream";

import { INDUSTRIES_UPDATE_SUPPLY_RATE, TIMEOUTS } from "./constant";

export function makeEmploymentAction(sources, industryName) {
  const employmentClick$ = xs.merge(
    sources.DOM.select(`.${industryName} .employ`)
      .events("click")
      .mapTo({
        type: "employment",
        reason: "employ",
        payload: { industryName }
      }),
    sources.DOM.select(`.${industryName} .layoff`)
      .events("click")
      .mapTo({
        type: "employment",
        reason: "layoff",
        payload: { industryName }
      })
  );
  return xs.merge(employmentClick$);
}

export function makeIndustrySupplyUpdate(sources, industryName) {
  const rate = INDUSTRIES_UPDATE_SUPPLY_RATE[industryName];
  const industry$ = sources.state.stream.map(
    state => state.industries[industryName]
  );
  const supplyUpdate$ = xs
    .periodic(TIMEOUTS.industries[industryName].supply)
    .mapTo(industry => ({
      ...industry,
      supply: industry.supply + rate * industry.employed
    }));
  return supplyUpdate$;
}

export function agricultureToFoodDelta(state) {
  const rate = INDUSTRIES_UPDATE_SUPPLY_RATE.foodService;
  const maxFoodDelta = rate.unit * state.industries.foodService.employed;
  if (maxFoodDelta === 0) {
    return {
      foodDelta: 0,
      agricultureSupplyDelta: 0
    };
  }
  const maxAgricultureSupplyDelta = maxFoodDelta * rate.agriculture;
  const ratio = Math.min(
    1,
    state.industries.agriculture.supply / maxAgricultureSupplyDelta
  );
  return {
    foodDelta: ratio * maxFoodDelta,
    // TODO(investigate): Do we need this `Math.max(0, ...)`?
    agricultureSupplyDelta: -Math.max(0, ratio * maxAgricultureSupplyDelta)
  };
}
