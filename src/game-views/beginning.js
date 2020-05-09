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
  sup,
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
import { update, set, ofWhich, range, cond, setAll } from "../../util";

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

const buttonIndexView = ({ page, label, pageState }) => {
  const { isNew } = pageState;
  return button(".index", { dataset: { page } }, [
    label,
    isNew ? sup("new") : null
  ]);
};

const wait = x =>
  new Promise(resolve => {
    setTimeout(() => resolve(x), 60e3);
  });

const singleButtonState = {
  employ: { attrs: { disabled: false } },
  layoff: { attrs: { disabled: false } }
};

const initIndustryGridButtonState = {
  agriculture: singleButtonState,
  foodService: singleButtonState,
  timber: singleButtonState,
  housing: singleButtonState
};

const setDisabled = toggle => ({ reason, industryName }) => state =>
  set(state, [industryName, reason, "attrs", "disabled"], toggle);

const isCurrentPagination = page => state => state.page === page;

const storyViewsSwitch = cond(
  [
    isCurrentPagination("introduction"),
    () =>
      import(/* webpackChunkName: "introduction" */
      "./beginning/introduction.md")
  ],
  [
    isCurrentPagination("one"),
    () =>
      import(/* webpackChunkName: "one" */
      "./beginning/one.md")
  ],
  [
    isCurrentPagination("two"),
    () => import(/* webpackChunkName: "two" */ "./beginning/two.md")
  ],
  [
    isCurrentPagination("tree-felling"),
    () =>
      import(/* webpackChunkName: "tree-felling" */ "./beginning/tree-felling.md")
  ]
);

const initPaginationStates = {
  introduction: { isNew: false },
  one: { isNew: true },
  two: { isNew: true },
  "tree-felling": { isNew: true }
};

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
    .map(page => state =>
      setAll(state, [["page", page], [["states", page, "isNew"], false]])
    )
    .fold(
      (state, reducer) => reducer(state),
      JSON.parse(localStorage.getItem("beginning-story-pagination")) || {
        page: "introduction",
        states: initPaginationStates
      }
    );

  // TODO: should this be global state? 'O_o
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
    .fold((state, reducer) => reducer(state), initIndustryGridButtonState);

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
      story$,
      paginationState$
    )
    .map(([state, buttonState, story, paginationState]) => {
      const {
        industries: { agriculture, foodService, timber, housing }
      } = state;
      return div(".beginning", [
        // TODO(probably?): move to separate view
        section(".industry-grid", [
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
            })
        ]),
        // TODO: implement
        section(".upgrade-grid", []),
        // TODO: move to separate view
        section(".story", [
          nav(".table-of-contents.tab-nav", [
            h3("Contents"),
            ...[
              {
                page: "introduction",
                label: "Introduction",
                pageState: paginationState.states["introduction"]
              },
              foodService.unlocked && {
                page: "one",
                label: "Productivity",
                pageState: paginationState.states["one"]
              },
              timber.unlocked && {
                page: "two",
                label: "Trees",
                pageState: paginationState.states["two"]
              },
              housing.unlocked && {
                page: "tree-felling",
                label: "Tree Felling Folk",
                pageState: paginationState.states["tree-felling"]
              }
            ]
              .filter(Boolean)
              .map(buttonIndexView)
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
