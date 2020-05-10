import xs from "xstream";

import {
  assert,
  setAll,
  withRandomOffset,
  update,
  updateAll
} from "../../util";
import { INDUSTRIES_UNLOCK_CONDITIONS, TIMEOUTS } from "../constant";

export function makeIndustriesUnlockReducer() {
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

function makeIndustrySupplyReducer(industryName) {
  const time = TIMEOUTS.industries[industryName];
  const supplyUpdate$ = xs.periodic(1e3 * time).mapTo(state => {
    const {
      derived: {
        derivative: {
          [industryName]: { supply: supplyDerivative, multiplier }
        }
      }
    } = state;
    const supplyMultiplier = multiplier?.supply || 1;
    const delta = withRandomOffset(supplyDerivative * time) * supplyMultiplier;
    assert(
      supplyMultiplier >= 1 && isFinite(supplyMultiplier),
      "`supplyMultiplier` should be finite and greater than 1",
      supplyMultiplier
    );
    assert(
      typeof delta === "number" && isFinite(delta) && delta >= 0,
      "`delta` has to be a positive number",
      {
        delta,
        industryName,
        state
      }
    );
    return update(
      state,
      ["industries", industryName, "supply"],
      supply => supply + delta
    );
  });
  return supplyUpdate$;
}

function makeFoodServiceUpdateReducer() {
  const time = TIMEOUTS.industries.foodService;
  const reducer$ = xs.periodic(1e3 * time).mapTo(state => {
    const {
      derived: { derivative }
    } = state;
    assert(
      derivative.foodService.multiplier >= 1 &&
        isFinite(derivative.foodService.multiplier),
      "foodService food `multiplier` should be greater than or equal to 1 and finite"
    );
    const foodDelta =
      derivative.foodService.food * derivative.foodService.multiplier * time;
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

function makeHousingUpdateReducer() {
  const time = TIMEOUTS.industries.housing;
  const reducer$ = xs.periodic(1e3 * time).mapTo(state => {
    const {
      industries,
      derived: { derivative }
    } = state;
    const maxUserHousesDelta = time * derivative.housing.user.houses;
    if (maxUserHousesDelta === 0) return state;
    const maxTimberSupplyDelta = time * derivative.housing.timber;
    const ratio = Math.min(
      1,
      Math.abs(industries.timber.supply / maxTimberSupplyDelta)
    );
    const housesDelta =
      ratio * maxUserHousesDelta * derivative.housing.multiplier;
    assert(
      derivative.housing.multiplier >= 1 &&
        isFinite(derivative.housing.multiplier),
      "housing multiplier should be nice",
      {
        derivative
      }
    );
    const timberDelta = ratio * maxTimberSupplyDelta;
    return updateAll(state, [
      ["user.houses", houses => houses + housesDelta],
      ["industries.timber.supply", supply => supply + timberDelta]
    ]);
  });
  return reducer$;
}

export function makeIndustriesUpdateReducer() {
  const agriculture$ = makeIndustrySupplyReducer("agriculture");
  const timber$ = makeIndustrySupplyReducer("timber");
  const foodService$ = makeFoodServiceUpdateReducer();
  const housing$ = makeHousingUpdateReducer();
  const education$ = makeIndustrySupplyReducer("education");
  const energy$ = makeIndustrySupplyReducer("energy");
  const health$ = makeIndustrySupplyReducer("health");
  return xs.merge(
    agriculture$,
    timber$,
    foodService$,
    housing$,
    education$,
    energy$,
    health$
  );
}
