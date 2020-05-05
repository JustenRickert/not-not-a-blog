import xs from "xstream";

import { EMPLOYMENT } from "../constant";
import { update, withRandomOffset } from "../../util";

export function makeEmploymentClickAction(sources) {
  const action$ = xs.merge(
    sources.DOM.select(".employ")
      .events("click")
      .map(event => ({
        type: "employment",
        reason: "employ",
        industryName: event.target.dataset.industry
      })),
    sources.DOM.select(".layoff")
      .events("click")
      .map(event => ({
        type: "employment",
        reason: "layoff",
        industryName: event.target.dataset.industry
      }))
  );

  return action$;
}

export function employmentActionReducer(action) {
  return state => {
    const {
      industries,
      derived: { unemployed }
    } = state;
    console.log(action, state);
    switch (action.reason) {
      case "employ": {
        const percentage = withRandomOffset(EMPLOYMENT.employRate);
        return update(
          state,
          ["industries", action.industryName, "employed"],
          employed => employed + percentage * unemployed
        );
      }
      case "layoff":
        const percentage = withRandomOffset(EMPLOYMENT.layoffRate);
        return update(
          state,
          ["industries", action.industryName, "employed"],
          employed => employed - percentage * employed
        );
      default:
        throw new Error("not impl");
    }
  };
}
