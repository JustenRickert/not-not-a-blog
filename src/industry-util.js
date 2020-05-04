import xs from "xstream";

import {
  INDUSTRIES_UPDATE_SUPPLY_RATE,
  TIMEOUTS,
  LEAST_POPULATION,
  POPULATION_GROWTH_RATE,
  POPULATION_CAPACITY,
  FOOD_PER_PERSON,
  LEAST_UPPER_CAPACITY
} from "./constant";
import { withRandomOffset, clamp, logisticDeltaEquation } from "../util";
import sampleCombine from "xstream/extra/sampleCombine";

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
  const derivative$ = sources.state.stream.map(
    state => state.derived.derivative[industryName][industryName]
  );
  const supplyUpdate$ = xs
    .periodic(1e3 * time)
    .compose(sampleCombine(derivative$))
    .map(([, derivative]) => industry => {
      const delta = withRandomOffset(derivative * time);
      if (delta < 0)
        console.log("THIS SHOULDNT BE NEGATIVE BUT IT IS", delta, industryName);
      return {
        ...industry,
        supply: industry.supply + delta
      };
    });
  return supplyUpdate$;
}

export function makeUserPopulationDerivative(state) {
  const foodRequired =
    FOOD_PER_PERSON * TIMEOUTS.population * state.user.population;
  if (state.user.food < foodRequired) {
    return logisticDeltaEquation(
      state.user.population,
      LEAST_POPULATION,
      POPULATION_GROWTH_RATE
    );
  } else {
    return logisticDeltaEquation(
      state.user.population,
      LEAST_UPPER_CAPACITY +
        POPULATION_CAPACITY.perPoint * state.user.points +
        POPULATION_CAPACITY.perHouse * state.user.houses,
      POPULATION_GROWTH_RATE
    );
  }
}

// _derivative_ is without time, _delta_ is with time. Totally not confusing...
export function makeFoodServiceDerivative(state) {
  const rate = INDUSTRIES_UPDATE_SUPPLY_RATE.foodService;
  const maxFoodDelta = rate.unit * state.industries.foodService.employed;
  const maxAgricultureSupplyDelta = maxFoodDelta * rate.agriculture;
  return {
    food: maxFoodDelta,
    agriculture: maxAgricultureSupplyDelta
  };
}

export function makeHousingDerivative(state) {
  const rate = INDUSTRIES_UPDATE_SUPPLY_RATE.housing;
  const userHousingDerivative = rate.unit * state.industries.housing.employed;
  const timberSupplyDerivative = userHousingDerivative * rate.timber;
  return {
    user: {
      houses: userHousingDerivative
    },
    timber: {
      supply: timberSupplyDerivative
    }
  };
}

export function agricultureToFoodDelta(state) {
  const time = TIMEOUTS.industries.foodService.agricultureToFood;
  const maxDelta = makeFoodServiceDerivative(state);
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
