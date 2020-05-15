import xs from "xstream";
import dropRepeats from "xstream/extra/dropRepeats";
import sampleCombine from "xstream/extra/sampleCombine";

import { logisticDeltaEquation, update } from "../util";
import roughlyPeriodic from "./roughly-periodic";
import { UPGRADES } from "./constant";

const RATE = {
  art: 1 / 400,
  metals: 1 / 500,
  science: 1 / 1e3,
  stones: 1 / 50,
  wood: 1 / 250
};

const UNLOCK_CONDITION = {
  population: state => Boolean(state.userInformation),
  resources: {
    art: state => state.upgrades.string.unlocked,
    metals: state => state.upgrades.furnace.unlocked,
    science: state => state.upgrades.cooking.unlocked,
    stones: state => state.userInformation,
    wood: state => state.upgrades.handTools.unlocked
  }
};

export default function makeGameUpdateReducer(sources) {
  const upgradeMultiplier$ = sources.state.stream
    .compose(dropRepeats(({ upgrades: u1 }, { upgrades: u2 }) => u1 === u2))
    .map(({ resources, upgrades }) =>
      Object.keys(resources).reduce(
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
      )
    );

  const periodicWhenUnlocked = condition =>
    sources.state.stream
      .map(condition)
      .compose(dropRepeats())
      .map(unlocked =>
        unlocked
          ? roughlyPeriodic(sources.Time.createOperator, 5e3)
          : xs.never()
      )
      .flatten()
      .compose(sampleCombine(upgradeMultiplier$))
      .map(([, multipliers]) => multipliers);

  const populationReducer$ = periodicWhenUnlocked(
    UNLOCK_CONDITION.population
  ).mapTo(state =>
    update(
      state,
      "population",
      population => population + logisticDeltaEquation(population, 10e3, 0.01)
    )
  );

  const stonesReducer$ = periodicWhenUnlocked(
    UNLOCK_CONDITION.resources.stones
  ).map(multipliers => state =>
    update(
      state,
      "resources.stones",
      stones => stones + RATE.stones * multipliers.stones * state.population
    )
  );

  const woodReducer$ = periodicWhenUnlocked(
    UNLOCK_CONDITION.resources.wood
  ).mapTo(state =>
    update(state, "resources.wood", wood => wood + RATE.wood * state.population)
  );

  const metalsReducer$ = periodicWhenUnlocked(
    UNLOCK_CONDITION.resources.metals
  ).mapTo(state =>
    update(
      state,
      "resources.metals",
      metals => metals + RATE.metals * state.population
    )
  );

  const artReducer$ = periodicWhenUnlocked(
    UNLOCK_CONDITION.resources.art
  ).mapTo(state =>
    update(state, "resources.art", art => art + RATE.art * state.population)
  );

  const scienceReducer$ = periodicWhenUnlocked(
    UNLOCK_CONDITION.resources.science
  ).mapTo(state =>
    update(
      state,
      "resources.science",
      science => science + RATE.science * state.population
    )
  );

  return xs.merge(
    populationReducer$,
    stonesReducer$,
    woodReducer$,
    metalsReducer$,
    artReducer$,
    scienceReducer$
  );
}
