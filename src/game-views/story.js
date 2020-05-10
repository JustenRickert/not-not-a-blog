import xs from "xstream";
import dropRepeats from "xstream/extra/dropRepeats";
import isolate from "@cycle/isolate";
import { withState } from "@cycle/state";
import { div, section, button, h3, sup, nav } from "@cycle/dom";

import { range, cond, setAll } from "../../util";
import throttle from "xstream/extra/throttle";

import "./story.css";
import "./loading.css";

const loading = div(".loading", range(4).map(() => div(["."])));

const buttonIndexView = ({ page, label, pageState }) => {
  const { isNew } = pageState;
  return button(".index", { dataset: { page } }, [
    label,
    isNew ? sup("new") : null
  ]);
};

const makePaginationStub = () => ({
  isNew: true
});

const initPaginationStates = {
  introduction: { ...makePaginationStub(), isNew: false },
  productivity: makePaginationStub(),
  two: makePaginationStub(),
  "tree-felling": makePaginationStub()
};

const isCurrentPagination = page => state => state.page === page;

const storyViewsSwitch = cond(
  [
    isCurrentPagination("introduction"),
    () =>
      import(/* webpackChunkName: "introduction" */
      "./chapters/introduction.md")
  ],
  [
    isCurrentPagination("productivity"),
    () =>
      import(/* webpackChunkName: "productivity" */
      "./chapters/productivity.md")
  ],
  [
    isCurrentPagination("two"),
    () => import(/* webpackChunkName: "two" */ "./chapters/two.md")
  ],
  [
    isCurrentPagination("tree-felling"),
    () =>
      import(/* webpackChunkName: "tree-felling" */ "./chapters/tree-felling.md")
  ]
);

function Story(sources) {
  const pageChangeAction$ = sources.DOM.select(
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

  sources.pagination.stream.addListener({
    next: state => {
      localStorage.setItem("chapters-story-pagination", JSON.stringify(state));
    }
  });

  const initReducer$ = xs.of(
    () =>
      JSON.parse(localStorage.getItem("chapters-story-pagination")) || {
        page: "introduction",
        states: initPaginationStates
      }
  );

  const pageChangeReducer$ = pageChangeAction$.map(page => state =>
    setAll(state, [["page", page], [["states", page, "isNew"], false]])
  );

  const story$ = sources.pagination.stream
    .map(state => state)
    .compose(dropRepeats())
    .map(storyViewsSwitch)
    .map(xs.fromPromise)
    .flatten()
    .map(m => m.default)
    .startWith(null);

  const dom$ = xs
    .combine(
      sources.state.stream.compose(throttle(2500)),
      sources.pagination.stream,
      story$
    )
    .map(([state, pagination, story]) => {
      const {
        industries: { foodService, timber, housing }
      } = state;
      return section(".story", [
        nav(".table-of-contents.tab-nav", [
          h3("Contents"),
          ...[
            {
              page: "introduction",
              label: "Introduction",
              pageState: pagination.states["introduction"]
            },
            foodService.unlocked && {
              page: "productivity",
              label: "Productivity",
              pageState: pagination.states["productivity"]
            },
            timber.unlocked && {
              page: "two",
              label: "Trees",
              pageState: pagination.states["two"]
            },
            housing.unlocked && {
              page: "tree-felling",
              label: "Tree Felling Folk",
              pageState: pagination.states["tree-felling"]
            }
          ]
            .filter(Boolean)
            .map(buttonIndexView)
        ]),
        story ? div(".chapter", { props: { innerHTML: story } }) : loading
      ]);
    });

  const reducer$ = xs.merge(initReducer$, pageChangeReducer$);

  return {
    DOM: dom$,
    pagination: reducer$
  };
}

export default isolate(withState(Story, "pagination"), {
  state: {
    get: state => state,
    set: (_, state) => state
  }
});
