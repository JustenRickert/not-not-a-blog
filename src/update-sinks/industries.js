import xs from "xstream";

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
  TIMEOUTS,
  EDUCATION_DERIVATIVE_MULTIPLIER
} from "../constant";

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
  // const rate = INDUSTRIES_UPDATE_SUPPLY_RATE[industryName];
  const time = TIMEOUTS.industries[industryName];
  console.log(industryName);
  const educationMultiplier =
    EDUCATION_DERIVATIVE_MULTIPLIER[industryName]?.supply;
  const supplyUpdate$ = xs.periodic(1e3 * time).mapTo(state => {
    const {
      derived: {
        derivative: {
          [industryName]: { supply: derivative }
        }
      }
    } = state;
    const delta = withRandomOffset(derivative * time);
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
    const foodDelta =
      derivative.foodService.food *
      derivative.foodService.educationMultiplier *
      time;
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
    const housesDelta = ratio * maxUserHousesDelta;
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
