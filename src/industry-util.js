import xs from "xstream";

import { INDUSTRIES_UPDATE_SUPPLY_RATE, TIMEOUTS } from "./constant";
import { withRandomOffset } from "../util";

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
  const time = TIMEOUTS.industries[industryName].supply;
  const industry$ = sources.state.stream.map(
    state => state.industries[industryName]
  );
  const supplyUpdate$ = xs.periodic(1e3 * time).mapTo(industry => ({
    ...industry,
    supply: industry.supply + withRandomOffset(rate * time * industry.employed)
  }));
  return supplyUpdate$;
}

export function makeFoodServiceDelta(state) {
  const rate = INDUSTRIES_UPDATE_SUPPLY_RATE.foodService;
  const time = TIMEOUTS.industries.foodService.agricultureToFood;
  const maxFoodDelta = rate.unit * time * state.industries.foodService.employed;
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
