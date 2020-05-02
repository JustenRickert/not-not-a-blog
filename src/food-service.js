import xs from "xstream";
import sampleCombine from "xstream/extra/sampleCombine";
import { div, button, h1, h2, h3, h4, a, ul, li, span } from "@cycle/dom";

import { update, updateAll } from "../util";
import { agricultureToFoodDelta, makeEmploymentAction } from "./industry-util";
import { TIMEOUTS, INDUSTRIES_UPDATE_SUPPLY_RATE } from "./constant";

function intent(sources) {
  const employmentAction$ = makeEmploymentAction(sources, "foodService");
  return xs.merge(employmentAction$);
}

function stateUpdate(sources) {
  const rate = INDUSTRIES_UPDATE_SUPPLY_RATE.foodService;
  const update$ = xs
    .periodic(TIMEOUTS.industries.foodService.agricultureToFood)
    .mapTo(state => {
      const { foodDelta, agricultureSupplyDelta } = agricultureToFoodDelta(
        state
      );
      return updateAll(state, [
        ["user.food", food => food + foodDelta],
        [
          "industries.agriculture.supply",
          supply => supply + agricultureSupplyDelta
        ]
      ]);
    });
  return update$;
}

export default function FoodService(sources) {
  const foodService$ = sources.state.stream.map(
    state => state.industries.foodService
  );

  const dom$ = foodService$.map(({ supply, employed, unlocked }) => {
    if (!unlocked) return null;
    return div(".foodService", [
      h3("Food Service"),
      ul([li(["employed", " ", employed])]),
      button(".employ", "employ"),
      button(".layoff", "layoff")
    ]);
  });

  const action$ = intent(sources);
  const stateReducer$ = stateUpdate(sources);

  return {
    DOM: dom$,
    action: action$,
    state: stateReducer$
  };
}
