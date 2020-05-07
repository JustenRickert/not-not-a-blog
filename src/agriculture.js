import xs from "xstream";
import { div, button, h1, h2, h3, h4, a, ul, li, span } from "@cycle/dom";

import { update } from "../util";
import {
  makeEmploymentAction,
  makeIndustrySupplyUpdate
} from "./industry-util";
import { whole, perSecond, plural, percentage } from "./format";

function intent(sources) {
  const employmentAction$ = makeEmploymentAction(sources, "agriculture");
  return xs.merge(employmentAction$);
}

export default function Agriculture(sources) {
  const derived$ = sources.state.stream.map(state => state.derived);
  const user$ = sources.state.stream.map(state => state.user);
  const agriculture$ = sources.state.stream.map(
    state => state.industries.agriculture
  );

  const dom$ = xs
    .combine(user$, agriculture$, derived$)
    .map(([{ population }, { supply, employed }, { derivative }]) =>
      div(".agriculture", [
        h3("Agriculture 🚜"),
        ul([
          li([
            whole(employed),
            " ",
            plural(employed, "worker", "workers"),
            ` (${percentage(employed / population)} of population)`
          ]),
          li([
            whole(supply),
            " ",
            plural(supply, "supply", "supplies"),
            " ",
            perSecond(
              derivative.agriculture.agriculture +
                derivative.foodService.agriculture
            )
          ])
        ]),
        button(".employ", "employ"),
        button(".layoff", "layoff")
      ])
    );

  const action$ = intent(sources);

  return {
    DOM: dom$,
    action: action$
  };
}
