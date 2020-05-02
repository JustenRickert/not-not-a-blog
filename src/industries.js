import xs from "xstream";
import { div, button, h1, h2, h3, h4, a, ul, li, span } from "@cycle/dom";
import sampleCombine from "xstream/extra/sampleCombine";

import { update, withRandomOffset } from "../util";
import { EMPLOYMENT } from "./constant";
import Agriculture from "./agriculture";

const makeIndustriesUpdateStream = sources => {
  // const
};

const industriesReducer = (action$, { info$ }) => {
  const employmentReducer = action$
    .filter(a => a.type === "employment")
    .compose(sampleCombine(info$))
    .map(([action, info]) => industries => {
      switch (action.reason) {
        case "employ": {
          const percentage = withRandomOffset(EMPLOYMENT.employRate);
          return update(
            industries,
            [action.payload.industryName, "employed"],
            employed => employed + percentage * info.unemployed
          );
        }
        case "layoff":
          const percentage = withRandomOffset(EMPLOYMENT.layoffRate);
          return update(
            industries,
            [action.payload.industryName, "employed"],
            employed => employed - percentage * employed
          );
        default:
          throw new Error("not impl");
      }
    });
  return xs.merge(employmentReducer);
};

export default function Industries(sources, { info$ }) {
  const industries$ = sources.state.stream.map(state => state.industries);

  const agricultureSinks = Agriculture(sources);

  const action$ = xs.merge(agricultureSinks.action);

  const dom$ = xs
    .combine(industries$, agricultureSinks.DOM)
    .map(([industries, agricultureDom]) => div([agricultureDom]));

  const reducer$ = xs.merge(
    industriesReducer(action$, { info$ }).map(reducer => state =>
      update(state, "industries", reducer)
    )
  );

  return {
    DOM: dom$,
    state: reducer$
  };
}
