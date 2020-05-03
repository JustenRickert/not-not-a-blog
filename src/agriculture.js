import xs from "xstream";
import { div, button, h1, h2, h3, h4, a, ul, li, span } from "@cycle/dom";

import { update } from "../util";
import {
  makeEmploymentAction,
  makeIndustrySupplyUpdate
} from "./industry-util";

function intent(sources) {
  const employmentAction$ = makeEmploymentAction(sources, "agriculture");
  return xs.merge(employmentAction$);
}

function industryUpdate(sources) {
  const update$ = makeIndustrySupplyUpdate(sources, "agriculture");
  return update$;
}

export default function Agriculture(sources, { info$ }) {
  const agriculture$ = sources.state.stream.map(
    state => state.industries.agriculture
  );

  const dom$ = xs
    .combine(agriculture$, info$)
    .map(([{ supply, employed }, { derivative }]) =>
      div(".agriculture", [
        h3("Agriculture"),
        ul([
          li(["employed", " ", employed]),
          li([
            "supply",
            " ",
            supply,
            " ",
            derivative.agriculture.agriculture +
              derivative.foodService.agriculture,
            "/s"
          ])
        ]),
        button(".employ", "employ"),
        button(".layoff", "layoff")
      ])
    );

  const action$ = intent(sources);
  const update$ = industryUpdate(sources);

  const updateReducer$ = update$.map(reducer => state =>
    update(state, "industries.agriculture", reducer)
  );

  return {
    DOM: dom$,
    action: action$,
    state: updateReducer$
  };
}
