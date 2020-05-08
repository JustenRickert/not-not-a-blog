import xs from "xstream";
import sampleCombine from "xstream/extra/sampleCombine";

import {
  assert,
  setAll,
  withRandomOffset,
  update,
  updateAll
} from "../../util";
import {
  INDUSTRIES_UNLOCK_CONDITIONS,
  INDUSTRIES_UPDATE_SUPPLY_RATE,
  TIMEOUTS
} from "../constant";
import { makeFoodServiceDerivative } from "../industry-util";

export function makeIndustriesUnlockReducer(sources) {
  const unlock$ = xs.periodic(1e3 * TIMEOUTS.unlockIndustries).mapTo(state =>
    setAll(
      state,
      Object.entries(INDUSTRIES_UNLOCK_CONDITIONS)
        .filter(
          ([industryName, predicate]) =>
            !state.industries[industryName].unlocked && predicate(state)
        )
        .map(([industryName]) => industryName)
        .map(industryName => [["industries", industryName, "unlocked"], true])
    )
  );
  return unlock$;
}

function makeIndustrySupplyReducer(sources, industryName) {
  const rate = INDUSTRIES_UPDATE_SUPPLY_RATE[industryName];
  const time = TIMEOUTS.industries[industryName].supply;
  const derivative$ = sources.state.stream.map(
    state => state.derived.derivative[industryName][industryName]
  );
  const supplyUpdate$ = xs
    .periodic(1e3 * time)
    .compose(sampleCombine(derivative$))
    .map(([, derivative]) => state => {
      const delta = withRandomOffset(derivative * time);
      assert(
        typeof delta === "number" && !isNaN(delta) && delta >= 0,
        "`delta` has to be a positive number"
      );
      return update(
        state,
        ["industries", industryName, "supply"],
        supply => supply + delta
      );
    });
  return supplyUpdate$;
}

function makeFoodServiceUpdateReducer(sources) {
  const time = TIMEOUTS.industries.foodService.agricultureToFood;
  const reducer$ = xs.periodic(1e3 * time).mapTo(state => {
    const {
      derived: { derivative }
    } = state;
    const foodDelta = derivative.foodService.food * time;
    const agricultureSupplyDelta = derivative.foodService.agriculture * time;
    if (foodDelta === 0) return state;
    const ratio = Math.min(
      1,
      Math.abs(state.industries.agriculture.supply / agricultureSupplyDelta)
    );
    return updateAll(state, [
      ["user.food", food => food + ratio * foodDelta],
      [
        "industries.agriculture.supply",
        supply => Math.max(0, supply + ratio * agricultureSupplyDelta) // clamping?
      ]
    ]);
  });
  return reducer$;
}

function makeHousingUpdateReducer(sources) {
  const time = TIMEOUTS.industries.housing.timberToHouses;
  const timberToHousesDelta$ = xs
    .periodic(1e3 * time)
    .compose(sampleCombine(sources.state.stream))
    .map(([, { industries, derived: { derivative } }]) => {
      const maxUserHousesDelta = time * derivative.housing.user.houses;
      if (maxUserHousesDelta === 0)
        return {
          userHouses: 0,
          timberSupply: 0
        };
      const maxTimberSupplyDelta = time * derivative.housing.timber.supply;
      const ratio = Math.min(
        1,
        Math.abs(industries.timber.supply / maxTimberSupplyDelta)
      );
      return {
        ratio,
        userHouses: ratio * maxUserHousesDelta,
        timberSupply: ratio * maxTimberSupplyDelta
      };
    });
  const reducer$ = timberToHousesDelta$.map(
    ({ userHouses, timberSupply }) => state =>
      updateAll(state, [
        ["user.houses", houses => houses + userHouses],
        ["industries.timber.supply", supply => supply + timberSupply]
      ])
  );
  return reducer$;
}

export function makeIndustriesUpdateReducer(sources) {
  const agriculture$ = makeIndustrySupplyReducer(sources, "agriculture");
  const timber$ = makeIndustrySupplyReducer(sources, "timber");
  const foodService$ = makeFoodServiceUpdateReducer(sources);
  const housing$ = makeHousingUpdateReducer(sources);
  return xs.merge(agriculture$, timber$, foodService$, housing$);
}
