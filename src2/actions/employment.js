import xs from "xstream";

import { EMPLOYMENT } from "../constant";
import { assert, update, withRandomOffset } from "../../util";

export function makeEmploymentClickAction(sources) {
  const toAction = reason => event => {
    const { industryName } = event.target.dataset;
    assert(
      industryName,
      "Employment button needs `industryName` in dataset",
      event
    );
    return {
      type: "employment",
      reason,
      industryName
    };
  };
  const action$ = xs.merge(
    sources.DOM.select(".employ")
      .events("click")
      .map(toAction("employ")),
    sources.DOM.select(".layoff")
      .events("click")
      .map(toAction("layoff"))
  );

  return action$;
}

export function employmentActionReducer(action) {
  return state => {
    const {
      derived: { unemployed }
    } = state;
    switch (action.reason) {
      case "employ": {
        const percentage = withRandomOffset(EMPLOYMENT.employRate);
        assert(unemployed >= 0, "`unemployed` can't be negative 'O_o");
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
