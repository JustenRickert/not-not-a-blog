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
      return update(state, ["industries", industryName], industry => ({
        ...industry,
        supply: industry.supply + delta
      }));
    });
  return supplyUpdate$;
}

// function agricultureToFoodDelta(state) {
//   const time = TIMEOUTS.industries.foodService.agricultureToFood;
//   const maxDelta = makeFoodServiceDerivative(state);
//   const maxFoodDelta = maxDelta.food * time;
//   const maxAgricultureDelta = maxDelta.agriculture * time;
//   if (maxFoodDelta === 0) {
//     return {
//       foodDelta: 0,
//       agricultureSupplyDelta: 0
//     };
//   }
//   const agricultureDelta = -Math.min(
//     state.industries.agriculture.supply,
//     Math.abs(maxAgricultureDelta)
//   );
//   const ratio = Math.min(1, agricultureDelta / maxAgricultureDelta);
//   return {
//     foodDelta: ratio * maxFoodDelta,
//     agricultureSupplyDelta: agricultureDelta,
//     ratio
//   };
// }

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
        supply => supply + ratio * agricultureSupplyDelta
      ]
    ]);
  });
  return reducer$;
}

export function makeIndustriesUpdateReducer(sources) {
  const agriculture$ = makeIndustrySupplyReducer(sources, "agriculture");
  const foodService$ = makeFoodServiceUpdateReducer(sources);
  return xs.merge(agriculture$, foodService$);
}
