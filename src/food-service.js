import xs from "xstream";
import sampleCombine from "xstream/extra/sampleCombine";
import { div, button, h1, h2, h3, h4, a, ul, li, span } from "@cycle/dom";

import { update, updateAll, withRandomOffset } from "../util";
import { makeEmploymentAction } from "./industry-util";
import { TIMEOUTS, INDUSTRIES_UPDATE_SUPPLY_RATE } from "./constant";
import { percentage, perSecond, whole } from "./format";
import { DINNER_PLATE } from "./string";

function intent(sources) {
  const employmentAction$ = makeEmploymentAction(sources, "foodService");
  return xs.merge(employmentAction$);
}

export default function FoodService(sources) {
  const derived$ = sources.state.stream.map(state => state.derived);

  const foodService$ = sources.state.stream.map(
    state => state.industries.foodService
  );
  const user$ = sources.state.stream.map(state => state.user);

  const dom$ = xs
    .combine(user$, foodService$, derived$)
    .map(([{ population }, { supply, employed, unlocked }, { derivative }]) => {
      if (!unlocked) return null;
      return div(".foodService", [
        h3(["Food Service", DINNER_PLATE]),
        ul([
          li([
            whole(employed),
            " workers",
            ` (${percentage(employed / population)} of population)`
          ]),
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
    action: action$
    // state: stateUpdateSinks.reducer
  };
}
