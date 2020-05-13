import xs from "xstream";
import dropRepeats from "xstream/extra/dropRepeats";
import { logisticDeltaEquation, update } from "../util";

import roughlyPeriodic from "./roughly-periodic";

const STONE_RATE = 1 / 100;
const WOOD_RATE = 1 / 250;
const METAL_RATE = 1 / 500;

const UNLOCK_CONDITION = {
  population: state => Boolean(state.userInformation),
  resources: {
    stones: state => Boolean(state.userInformation),
    wood: state => Boolean(state.upgrades.handTools.unlocked),
    metals: state => Boolean(state.upgrades.furnace.unlocked)
  }
};

export default function makeGameUpdateReducer(sources) {
  const periodicWhenUnlocked = condition =>
    sources.state.stream
      .map(condition)
      .compose(dropRepeats())
      .map(unlocked =>
        unlocked
          ? roughlyPeriodic(sources.Time.createOperator, 5e3)
          : xs.never()
      )
      .flatten();

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
  ).mapTo(state =>
    update(
      state,
      "resources.stones",
      stones => stones + STONE_RATE * state.population
    )
  );

  const woodReducer$ = periodicWhenUnlocked(
    UNLOCK_CONDITION.resources.wood
  ).mapTo(state =>
    update(state, "resources.wood", wood => wood + WOOD_RATE * state.population)
  );

  const metalsReducer$ = periodicWhenUnlocked(
    UNLOCK_CONDITION.resources.metals
  ).mapTo(state =>
    update(
      state,
      "resources.metals",
      metals => metals + METAL_RATE * state.population
    )
  );

  return xs.merge(
    populationReducer$,
    stonesReducer$,
    woodReducer$,
    metalsReducer$
  );
}
