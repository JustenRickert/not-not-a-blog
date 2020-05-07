import xs from "xstream";
import { div, button, h1, h2, h3, h4, a, ul, li, span } from "@cycle/dom";
import sampleCombine from "xstream/extra/sampleCombine";

import { setAll, update, withRandomOffset } from "../util";
import { EMPLOYMENT, INDUSTRIES_UNLOCK_CONDITIONS, TIMEOUTS } from "./constant";
import Agriculture from "./agriculture";
import FoodService from "./food-service";
import Timber from "./timber";
import Housing from "./housing";

const industriesReducer = action$ => {
  const employmentReducer = action$
    .filter(a => a.type === "employment")
    .map(action => state => {
      const {
        industries,
        derived: { unemployed, employed }
      } = state;
      switch (action.reason) {
        case "employ": {
          const percentage = withRandomOffset(EMPLOYMENT.employRate);
          return update(
            state,
            ["industries", action.payload.industryName, "employed"],
            employed => employed + percentage * unemployed
          );
        }
        case "layoff":
          const percentage = withRandomOffset(EMPLOYMENT.layoffRate);
          return update(
            state,
            ["industries", action.payload.industryName, "employed"],
            employed => employed - percentage * employed
          );
        default:
          throw new Error("not impl");
      }
    });
  return xs.merge(employmentReducer);
};

export default function Industries(sources) {
  const derived$ = sources.state.stream.map(state => state.derived);
  const agricultureSinks = Agriculture(sources);
  const foodServiceSinks = FoodService(sources);
  const timberSinks = Timber(sources);
  const housingSinks = Housing(sources);

  const action$ = xs.merge(
    agricultureSinks.action,
    foodServiceSinks.action,
    timberSinks.action,
    housingSinks.action
  );

  const dom$ = xs
    .combine(
      agricultureSinks.DOM,
      foodServiceSinks.DOM,
      timberSinks.DOM,
      housingSinks.DOM
    )
    .map(([agricultureDom, foodServiceDom, timberDom, housingDom]) =>
      div([agricultureDom, foodServiceDom, timberDom, housingDom])
    );

  const reducer$ = xs.merge(
    // TODO these should be moved to update-sinks
    timberSinks.state,
    housingSinks.state,
    industriesReducer(action$)
  );

  return {
    DOM: dom$,
    state: reducer$
  };
}
