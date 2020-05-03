import xs from "xstream";

import { INDUSTRIES_UPDATE_SUPPLY_RATE, TIMEOUTS } from "./constant";
import { withRandomOffset, clamp } from "../util";

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
  const supplyUpdate$ = xs.periodic(1e3 * time).mapTo(industry => {
    const delta = withRandomOffset(rate * time * industry.employed);
    if (delta < 0)
      console.log("THIS SHOULDNT BE NEGATIVE BUT IT IS", delta, industryName);
    return {
      ...industry,
      supply: industry.supply + delta
    };
  });
  return supplyUpdate$;
}

// _differential_ is without time, _delta_ is with time. Totally not
// confusing...
export function makeFoodServiceDifferential(state) {
  const rate = INDUSTRIES_UPDATE_SUPPLY_RATE.foodService;
  const maxFoodDelta = rate.unit * state.industries.foodService.employed;
  const maxAgricultureSupplyDelta = maxFoodDelta * rate.agriculture;
  return {
    food: maxFoodDelta,
    agriculture: maxAgricultureSupplyDelta
  };
}

export function agricultureToFoodDelta(state) {
  const time = TIMEOUTS.industries.foodService.agricultureToFood;
  const maxDelta = makeFoodServiceDifferential(state);
  const maxFoodDelta = maxDelta.food * time;
  const maxAgricultureDelta = maxDelta.agriculture * time;
  if (maxFoodDelta === 0) {
    return {
      foodDelta: 0,
      agricultureSupplyDelta: 0
    };
  }
  const agricultureDelta = -Math.min(
    state.industries.agriculture.supply,
    Math.abs(maxAgricultureDelta)
  );
  const ratio = Math.min(1, agricultureDelta / maxAgricultureDelta);
  return {
    foodDelta: ratio * maxFoodDelta,
    agricultureSupplyDelta: agricultureDelta,
    ratio
  };
}
