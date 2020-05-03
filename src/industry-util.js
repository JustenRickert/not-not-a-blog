import xs from "xstream";

import { INDUSTRIES_UPDATE_SUPPLY_RATE, TIMEOUTS } from "./constant";

// TODO: employ/layoff actions should temporarily disable employ/layoff
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

export function makeFoodServiceDelta(state) {
  const rate = INDUSTRIES_UPDATE_SUPPLY_RATE.foodService;
  const maxFoodDelta = rate.unit * state.industries.foodService.employed;
  const maxAgricultureSupplyDelta = maxFoodDelta * rate.agriculture;
  return {
    food: maxFoodDelta,
    agriculture: maxAgricultureSupplyDelta
  };
}

export function agricultureToFoodDelta(state) {
  const maxDelta = makeFoodServiceDelta(state);
  if (maxDelta.food === 0) {
    return {
      foodDelta: 0,
      agricultureSupplyDelta: 0
    };
  }
  const ratio = Math.min(
    1,
    Math.abs(state.industries.agriculture.supply / maxDelta.agriculture)
  );
  return {
    foodDelta: ratio * maxDelta.food,
    // TODO(investigate): Do we need this `Math.min(0, ...)`?
    agricultureSupplyDelta: Math.min(0, ratio * maxDelta.agriculture)
  };
}
