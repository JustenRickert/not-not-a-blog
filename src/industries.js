import xs from "xstream";
import { div, button, h1, h2, h3, h4, a, ul, li, span } from "@cycle/dom";
import sampleCombine from "xstream/extra/sampleCombine";

import { setAll, update, withRandomOffset } from "../util";
import { EMPLOYMENT, INDUSTRIES_UNLOCK_CONDITIONS, TIMEOUTS } from "./constant";
import Agriculture from "./agriculture";
import FoodService from "./food-service";
import Timber from "./timber";

const makeUnlockIndustries = sources => {
  const unlock$ = xs
    .periodic(1e3 * TIMEOUTS.unlockIndustries)
    .compose(sampleCombine(sources.state.stream))
    .map(([, state]) =>
      Object.entries(INDUSTRIES_UNLOCK_CONDITIONS)
        .filter(
          ([industryName, predicate]) =>
            !state.industries[industryName].unlocked && predicate(state)
        )
        .map(([industryName]) => industryName)
    )
    .map(industryNames => state =>
      setAll(
        state,
        industryNames.map(industryName => [
          ["industries", industryName, "unlocked"],
          true
        ])
      )
    );
  return unlock$;
};

const industriesReducer = (action$, { derived$ }) => {
  const employmentReducer = action$
    .filter(a => a.type === "employment")
    .compose(sampleCombine(derived$))
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

export default function Industries(sources) {
  const derived$ = sources.state.stream.map(state => state.derived);
  const agricultureSinks = Agriculture(sources);
  const foodServiceSinks = FoodService(sources);
  const timberSinks = Timber(sources, { derived$ });

  const action$ = xs.merge(
    agricultureSinks.action,
    foodServiceSinks.action,
    timberSinks.action
  );

  const dom$ = xs
    .combine(agricultureSinks.DOM, foodServiceSinks.DOM, timberSinks.DOM)
    .map(([agricultureDom, foodServiceDom, timberDom]) =>
      div([agricultureDom, foodServiceDom, timberDom])
    );

  const unlockIndustries$ = makeUnlockIndustries(sources);

  const reducer$ = xs.merge(
    unlockIndustries$,
    foodServiceSinks.state,
    agricultureSinks.state,
    timberSinks.state,
    industriesReducer(action$, { derived$ }).map(reducer => state =>
      update(state, "industries", reducer)
    )
  );

  return {
    DOM: dom$,
    state: reducer$
  };
}
