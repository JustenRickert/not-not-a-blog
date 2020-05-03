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
  const update$ = xs
    .periodic(1e3 * TIMEOUTS.industries.foodService.agricultureToFood)
    .mapTo(state => {
      const { foodDelta, agricultureSupplyDelta } = agricultureToFoodDelta(
        state
      );
      return updateAll(state, [
        ["user.food", food => food + withRandomOffset(foodDelta * time)],
        [
          "industries.agriculture.supply",
          supply => supply + withRandomOffset(agricultureSupplyDelta * time)
        ]
      ]);
    });
  return update$;
}

export default function FoodService(sources, { derived$ }) {
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
  const stateReducer$ = stateUpdate(sources);

  return {
    DOM: dom$,
    action: action$,
    state: stateReducer$
  };
}
