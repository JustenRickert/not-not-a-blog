import xs from "xstream";
import { div, section, button, h4 } from "@cycle/dom";
import delay from "xstream/extra/delay";
import throttle from "xstream/extra/throttle";

import {
  DINNER_PLATE,
  TRACTOR,
  TREE,
  HOUSE,
  OPEN_BOOK,
  ELECTRICITY,
  AESCULAPIUS
} from "../string";
import { whole, percentage } from "../format";
import {
  makeEmploymentClickAction,
  employmentActionReducer
} from "../actions/employment";
import { set } from "../../util";
import isolate from "@cycle/isolate";
import { withState } from "@cycle/state";

import "./industry-grid.css";

const industryView = (
  industryName,
  { industry, symbol, buttonState, state }
) => {
  const {
    user: { population }
  } = state;
  return div(".industry-item", [
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
  ]);
};

const singleButtonState = {
  employ: { attrs: { disabled: false } },
  layoff: { attrs: { disabled: false } }
};

const initIndustryGridButtonState = {
  agriculture: singleButtonState,
  foodService: singleButtonState,
  timber: singleButtonState,
  housing: singleButtonState,
  education: singleButtonState,
  energy: singleButtonState,
  health: singleButtonState
};

const setDisabled = toggle => ({ reason, industryName }) => gridState =>
  set(
    gridState,
    ["buttonState", industryName, reason, "attrs", "disabled"],
    toggle
  );

function IndustryGrid(sources) {
  const employmentAction$ = makeEmploymentClickAction(sources);

  const initGridReducer$ = xs.of(() => ({
    buttonState: initIndustryGridButtonState
  }));

  const industryGridButtonEmploymentReducer$ = xs.merge(
    employmentAction$.map(setDisabled(true)),
    employmentAction$.map(setDisabled(false)).compose(delay(15e3))
  );

  const dom$ = xs
    .combine(sources.state.stream.compose(throttle(200)), sources.grid.stream)
    .map(([state, grid]) => {
      const {
        industries: {
          agriculture,
          foodService,
          timber,
          housing,
          education,
          energy,
          health
        }
      } = state;
      const { buttonState } = grid;
      return section(".industry-grid", [
        industryView("agriculture", {
          industry: agriculture,
          symbol: TRACTOR,
          buttonState: buttonState["agriculture"],
          state
        }),
        foodService.unlocked &&
          industryView("foodService", {
            industry: foodService,
            symbol: DINNER_PLATE,
            buttonState: buttonState["foodService"],
            state
          }),
        timber.unlocked &&
          industryView("timber", {
            industry: timber,
            symbol: TREE,
            buttonState: buttonState["timber"],
            state
          }),
        housing.unlocked &&
          industryView("housing", {
            industry: housing,
            symbol: HOUSE,
            buttonState: buttonState["housing"],
            state
          }),
        education.unlocked &&
          industryView("education", {
            industry: education,
            symbol: OPEN_BOOK,
            buttonState: buttonState["education"],
            state
          }),
        energy.unlocked &&
          industryView("energy", {
            industry: energy,
            symbol: ELECTRICITY,
            buttonState: buttonState["energy"],
            state
          }),
        health.unlocked &&
          industryView("health", {
            industry: health,
            symbol: AESCULAPIUS,
            buttonState: buttonState["health"],
            state
          })
      ]);
    });

  const gridReducer$ = xs.merge(
    initGridReducer$,
    industryGridButtonEmploymentReducer$
  );

  const stateReducer$ = employmentAction$.map(employmentActionReducer);

  return {
    DOM: dom$,
    state: stateReducer$,
    grid: gridReducer$
  };
}

export default isolate(withState(IndustryGrid, "grid"), {
  state: {
    get: state => state,
    set: (_, state) => state
  }
});
