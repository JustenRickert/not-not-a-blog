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
import throttle from "xstream/extra/throttle";

import { DINNER_PLATE, TRACTOR, TREE, HOUSE } from "../string";
import { whole, percentage } from "../format";
import {
  makeEmploymentClickAction,
  employmentActionReducer
} from "../actions/employment";
import { update, set, ofWhich, range, cond } from "../../util";

import "./beginning.css";
import "./loading.css";

const loading = div(".loading", range(4).map(() => div(["."])));

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

const initButtonState = {
  agriculture: singleButtonState,
  foodService: singleButtonState,
  timber: singleButtonState,
  housing: singleButtonState
};

const setDisabled = toggle => ({ reason, industryName }) => state =>
  set(state, [industryName, reason, "attrs", "disabled"], toggle);

const isCurrentPagination = page => state => state.page === page;

const storyViewsSwitch = cond(
  [isCurrentPagination("one"), () => import("./beginning/one.md")],
  [isCurrentPagination("two"), () => import("./beginning/two.md")]
);

const wait = x =>
  new Promise(resolve => {
    setTimeout(() => resolve(x), 60e3);
  });

function intent(sources) {
  const employmentAction$ = makeEmploymentClickAction(sources);
  const storyPagination$ = sources.DOM.select(
    ".story .table-of-contents .index"
  )
    .events("click")
    .map(
      ({
        currentTarget: {
          dataset: { page }
        }
      }) => page
    );

  return {
    employment: employmentAction$,
    pagination: storyPagination$
  };
}

export default function Beginning(sources) {
  const {
    employment: employmentAction$,
    pagination: paginationAction$
  } = intent(sources);

  const paginationState$ = paginationAction$
    .debug()
    .map(page => state => update(state, "page", page))
    .fold(
      (state, reducer) => reducer(state),
      JSON.parse(localStorage.getItem("beginning-story-pagination")) || {
        page: "one"
      }
    );

  paginationState$.addListener({
    next: page => {
      localStorage.setItem("beginning-story-pagination", JSON.stringify(page));
    }
  });

  const industryGridButtonState$ = xs
    .merge(
      employmentAction$.map(setDisabled(true)),
      employmentAction$.map(setDisabled(false)).compose(delay(15e3))
    )
    .fold((state, reducer) => reducer(state), initButtonState);

  const story$ = paginationState$
    .map(storyViewsSwitch)
    .map(xs.fromPromise)
    .flatten()
    .map(m => m.default)
    .startWith(null);

  const dom$ = xs
    .combine(
      sources.state.stream.compose(throttle(100)),
      industryGridButtonState$,
      story$
    )
    .map(([state, buttonState, story]) => {
      const {
        industries: { agriculture, foodService, timber, housing }
      } = state;
      return div(".beginning", [
        section(".industry-grid", [
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
            })
        ]),
        section(".upgrade-grid", []),
        section(".story", [
          nav(".table-of-contents.tab-nav", [
            h3("Contents"),
            button(".index", { dataset: { page: "one" } }, "Productivity"),
            button(".index", { dataset: { page: "two" } }, "Tree Felling")
          ]),
          story ? div(".chapter", { props: { innerHTML: story } }) : loading
        ])
      ]);
    });

  const reducer$ = employmentAction$.map(employmentActionReducer);

  return {
    DOM: dom$,
    state: reducer$
  };
}
