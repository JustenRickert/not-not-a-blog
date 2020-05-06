import xs from "xstream";
import {
  div,
  section,
  button,
  h1,
  h2,
  h3,
  h4,
  i,
  a,
  p,
  ul,
  li,
  span,
  nav
} from "@cycle/dom";
import delay from "xstream/extra/delay";

import { TRACTOR, DINNER_PLATE } from "../string";
import { whole, percentage } from "../format";
import {
  makeEmploymentClickAction,
  employmentActionReducer
} from "../actions/employment";
import { update, set } from "../../util";

const industryView = (
  industryName,
  { industry, symbol, buttonState, state }
) => {
  const {
    user: { population }
  } = state;
  return div([
    ul(
      li([
        h4(".compact-header", [
          symbol,
          whole(industry.employed),
          " ",
          `(${percentage(industry.employed / population)})`
        ]),
        button(
          ".employ",
          { ...buttonState.employ, dataset: { industryName } },
          "Employ"
        ),
        button(
          ".layoff",
          { ...buttonState.layoff, dataset: { industryName } },
          "Layoff"
        )
      ])
    )
  ]);
};

const singleButtonState = {
  employ: { attrs: { disabled: false } },
  layoff: { attrs: { disabled: false } }
};

const initButtonState = {
  agriculture: singleButtonState,
  foodService: singleButtonState
};

const setDisabled = toggle => ({ reason, industryName }) => state =>
  set(state, [industryName, reason, "attrs", "disabled"], toggle);

export default function Beginning(sources) {
  const employmentAction$ = makeEmploymentClickAction(sources);

  const buttonState$ = xs
    .merge(
      employmentAction$.map(setDisabled(true)),
      employmentAction$.map(setDisabled(false)).compose(delay(15e3))
    )
    .fold((state, reducer) => reducer(state), initButtonState);

  const dom$ = xs
    .combine(sources.state.stream, buttonState$)
    .map(([state, buttonState]) => {
      const {
        industries: { agriculture, foodService }
      } = state;
      return div([
        industryView("agriculture", {
          industry: agriculture,
          symbol: TRACTOR,
          buttonState: buttonState["agriculture"],
          state
        }),
        industryView("foodService", {
          industry: foodService,
          symbol: DINNER_PLATE,
          buttonState: buttonState["foodService"],
          state
        })
      ]);
    });

  const reducer$ = employmentAction$.map(employmentActionReducer);

  return {
    DOM: dom$,
    state: reducer$
  };
}
