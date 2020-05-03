import xs from "xstream";
import { div, button, h1, h2, h3, h4, a, ul, li, span } from "@cycle/dom";

import { percentage, whole, plural, perSecond } from "./format";
import {
  makeEmploymentAction,
  makeIndustrySupplyUpdate
} from "./industry-util";
import { update } from "../util";

function intent(sources) {
  const employmentAction$ = makeEmploymentAction(sources, "timber");
  return employmentAction$;
}

function industryUpdate(sources) {
  const update$ = makeIndustrySupplyUpdate(sources, "timber");
  return update$;
}

export default function Timber(sources) {
  const derived$ = sources.state.stream.map(state => state.derived);
  const user$ = sources.state.stream.map(state => state.user);
  const timber$ = sources.state.stream.map(state => state.industries.timber);

  const dom$ = xs
    .combine(user$, timber$, derived$)
    .map(([{ population }, { supply, employed, unlocked }, { derivative }]) => {
      if (!unlocked) return null;
      return div(".timber", [
        h3("Timber"),
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
            perSecond(derivative.timber.timber)
          ]),
          button(".employ", "employ"),
          button(".layoff", "layoff")
        ])
      ]);
    });

  const action$ = intent(sources);
  const updateReducer$ = industryUpdate(sources).map(reducer => state =>
    update(state, "industries.timber", reducer)
  );

  return {
    DOM: dom$,
    action: action$,
    state: updateReducer$
  };
}
