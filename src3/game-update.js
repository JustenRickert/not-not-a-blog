import xs from "xstream";
import dropRepeats from "xstream/extra/dropRepeats";

import { logisticDeltaEquation, get, update, withRandomOffset } from "../util";
import roughlyPeriodic from "./roughly-periodic";
import { UPGRADES, GAME_UPDATE_UNLOCK_CONDITION, TIMEOUT } from "./constant";

const RATE = {
  art: 1 / 400,
  // biomass: 1 / 1e3,
  metals: 1 / 500,
  // petroleum: 1 / 1e3,
  // philosophy: 1 / 1e3,
  science: 1 / 1e3,
  stones: 1 / 50,
  wood: 1 / 250
};

export function computeGameUpdateRates(state) {
  const { population, resources, upgrades } = state;
  const multipliers = Object.keys(resources).reduce(
    (upgradeMultipliers, resourceId) => ({
      ...upgradeMultipliers,
      [resourceId]: Object.entries(UPGRADES).reduce(
        (multiplier, [upgradeId, { multiplier: { resources } = {} }]) =>
          resources && resources[resourceId] && upgrades[upgradeId].unlocked
            ? multiplier * resources[resourceId]
            : multiplier,
        1
      )
    }),
    {}
  );
  return {
    population: logisticDeltaEquation(population, 10e3, 0.01),
    resources: Object.entries(RATE).reduce(
      (rates, [resourceName, rate]) => ({
        ...rates,
        [resourceName]: rate * multipliers[resourceName] * population
      }),
      {}
    )
  };
}

export default function makeGameUpdateReducer(sources) {
  const periodicWhenUnlocked = condition =>
    sources.state.stream
      .map(condition)
      .compose(dropRepeats())
      .map(unlocked =>
        unlocked
          ? roughlyPeriodic(sources.Time.createOperator, TIMEOUT)
          : xs.never()
      )
      .flatten();

  const updateReducers$ = [
    "population",
    "resources.stones",
    "resources.wood",
    "resources.metals",
    "resources.art",
    "resources.science"
  ].map(key =>
    periodicWhenUnlocked(get(GAME_UPDATE_UNLOCK_CONDITION, key)).mapTo(state =>
      update(state, key, v => v + withRandomOffset(get(state.updateRates, key)))
    )
  );

  return xs.merge(...updateReducers$);
}
