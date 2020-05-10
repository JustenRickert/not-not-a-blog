import xs from "xstream";

import {
  INDUSTRIES_UPDATE_SUPPLY_RATE,
  TIMEOUTS,
  LEAST_POPULATION,
  POPULATION_GROWTH_RATE,
  POPULATION_CAPACITY,
  FOOD_PER_PERSON,
  LEAST_UPPER_CAPACITY,
  POPULATION_LOSS_RATE,
  EDUCATION_DERIVATIVE_MULTIPLIER,
  ENERGY_DERIVATIVE_MULTIPLIER
} from "./constant";
import { withRandomOffset, clamp, logisticDeltaEquation } from "../util";
import sampleCombine from "xstream/extra/sampleCombine";

// TODO: employ/layoff actions should temporarily disable employ/layoff
export function makeEmploymentAction(sources, industryName) {
  console.warn("DEPRECATE ME");
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

export function populationCapacity(state) {
  return (
    LEAST_UPPER_CAPACITY +
    POPULATION_CAPACITY.perPoint * state.user.points +
    POPULATION_CAPACITY.perHouse * state.user.houses
  );
}

export function makeUserPopulationDerivative(state) {
  const foodRequired =
    FOOD_PER_PERSON * TIMEOUTS.population * state.user.population;
  if (state.user.food < foodRequired) {
    return logisticDeltaEquation(
      state.user.population,
      LEAST_POPULATION,
      POPULATION_LOSS_RATE
    );
  } else {
    return logisticDeltaEquation(
      state.user.population,
      populationCapacity(state),
      POPULATION_GROWTH_RATE
    );
  }
}

// _derivative_ is without time, _delta_ is with time. Totally not confusing...
export function makeFoodServiceDerivative(state) {
  const {
    industries: { foodService, education }
  } = state;
  const rate = INDUSTRIES_UPDATE_SUPPLY_RATE.foodService;
  const maxFoodDelta = rate.unit * foodService.employed;
  const maxAgricultureSupplyDelta = maxFoodDelta * rate.agriculture;
  const educationMultiplier =
    (EDUCATION_DERIVATIVE_MULTIPLIER.foodService.user.food - 1) *
    education.employed;
  return {
    educationMultiplier,
    food: maxFoodDelta,
    agriculture: maxAgricultureSupplyDelta
  };
}

export function makeHousingDerivative(state) {
  const {
    industries: { energy, housing }
  } = state;
  const rate = INDUSTRIES_UPDATE_SUPPLY_RATE.housing;
  const userHousingDerivative = rate.unit * housing.employed;
  const timberSupplyDerivative = userHousingDerivative * rate.timber;
  return {
    multiplier:
      1 + (ENERGY_DERIVATIVE_MULTIPLIER.housing.supply - 1) * energy.employed,
    user: {
      houses: userHousingDerivative
    },
    timber: timberSupplyDerivative
  };
}
