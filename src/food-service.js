import xs from "xstream";
import sampleCombine from "xstream/extra/sampleCombine";
import { div, button, h1, h2, h3, h4, a, ul, li, span } from "@cycle/dom";

import { update, updateAll, withRandomOffset } from "../util";
import { agricultureToFoodDelta, makeEmploymentAction } from "./industry-util";
import { TIMEOUTS, INDUSTRIES_UPDATE_SUPPLY_RATE } from "./constant";
import { perSecond, whole } from "./format";

function intent(sources) {
  const employmentAction$ = makeEmploymentAction(sources, "foodService");
  return xs.merge(employmentAction$);
}

function stateUpdate(sources) {
  const time = TIMEOUTS.industries.foodService.agricultureToFood;
  const agricultureToFoodDelta$ = xs
    .periodic(1e3 * time)
    // accounts for time already
    .mapTo(agricultureToFoodDelta)
    .compose(sampleCombine(sources.state.stream))
    .map(([reducer, state]) => reducer(state))
    .map(delta =>
      updateAll(delta, [
        ["foodDelta", withRandomOffset],
        ["agricultureSupplyDelta", withRandomOffset]
      ])
    );
  // a bit annoying that we have to thread through state twice... once to
  // compute the delta, then again to actually reduce the result
  const reducer$ = agricultureToFoodDelta$.map(
    ({ foodDelta, agricultureSupplyDelta }) => state =>
      updateAll(state, [
        ["user.food", food => food + foodDelta],
        [
          "industries.agriculture.supply",
          supply => Math.max(0, supply + agricultureSupplyDelta) // avoid negative supply
        ]
      ])
  );
  return {
    reducer: reducer$,
    agricultureToFoodDelta: agricultureToFoodDelta$
  };
}

export default function FoodService(sources, { derived$ }) {
  const stateUpdateSinks = stateUpdate(sources);

  const notEnoughAgriculture$ = stateUpdateSinks.agricultureToFoodDelta.filter(
    ({ ratio }) => typeof ratio === "number" && ratio < 1
  );

  notEnoughAgriculture$.addListener({
    next: delta => {
      console.log("TODO");
      console.log(
        "There is not enough agriculture to support the amount of food",
        "employed to produce it!",
        "Probably just want to show like an error or something"
      );
    }
  });

  const foodService$ = sources.state.stream.map(
    state => state.industries.foodService
  );

  const dom$ = xs
    .combine(foodService$, derived$)
    .map(([{ supply, employed, unlocked }, { derivative }]) => {
      if (!unlocked) return null;
      return div(".foodService", [
        h3("Food Service"),
        ul([
          li([whole(employed), " workers"]),
          li([perSecond(derivative.foodService.food), " food"]),
          li([perSecond(derivative.foodService.agriculture), " agriculture"])
        ]),
        button(".employ", "employ"),
        button(".layoff", "layoff")
      ]);
    });

  const action$ = intent(sources);

  return {
    DOM: dom$,
    action: action$,
    state: stateUpdateSinks.reducer
  };
}
