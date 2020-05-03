import xs from "xstream";
import { div, button, h1, h2, h3, h4, a, ul, li, span } from "@cycle/dom";

import { update } from "../util";
import {
  makeEmploymentAction,
  makeIndustrySupplyUpdate
} from "./industry-util";
import { whole, perSecond, plural } from "./format";

function intent(sources) {
  const employmentAction$ = makeEmploymentAction(sources, "agriculture");
  return xs.merge(employmentAction$);
}

function industryUpdate(sources) {
  const update$ = makeIndustrySupplyUpdate(sources, "agriculture");
  return update$;
}

export default function Agriculture(sources, { derived$ }) {
  const agriculture$ = sources.state.stream.map(
    state => state.industries.agriculture
  );

  const dom$ = xs
    .combine(agriculture$, derived$)
    .map(([{ supply, employed }, { derivative }]) =>
      div(".agriculture", [
        h3("Agriculture"),
        ul([
          li([whole(employed), " ", plural(employed, "worker", "workers")]),
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
