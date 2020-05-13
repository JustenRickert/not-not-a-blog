import xs from "xstream";
import dropRepeats from "xstream/extra/dropRepeats";
import isolate from "@cycle/isolate";
import { withState } from "@cycle/state";
import { div, section, button, h3, h4, sup, nav } from "@cycle/dom";

import { range, setAll, ofWhich, set } from "../../util";
import throttle from "xstream/extra/throttle";

import "./story.css";
import "./loading.css";

const loading = div(".loading", range(4).map(() => div(["."])));

const stories = [
  {
    page: "introduction",
    label: "Introduction",
    condition: () => true,
    import: () =>
      import(/* webpackChunkName: "introduction" */
      "./chapters/introduction.md")
  },
  {
    page: "productivity",
    label: "Productivity",
    condition: industries => industries.foodService.unlocked,
    import: () =>
      import(/* webpackChunkName: "productivity" */
      "./chapters/productivity.md")
  },
  {
    page: "two",
    label: "Trees",
    condition: industries => industries.timber.unlocked,
    import: () =>
      import(/* webpackChunkName: "two" */
      "./chapters/two.md")
  },
  {
    page: "tree-felling",
    label: "Tree Felling Folk",
    condition: industries => industries.housing.unlocked,
    import: () =>
      import(/* webpackChunkName: "tree-felling" */
      "./chapters/tree-felling.md")
  },
  {
    page: "more-industries",
    label: "More Industries",
    condition: ({ education, energy, health }) =>
      education.unlocked && energy.unlocked && health.unlocked,
    import: () =>
      import(/* webpackChunkName: "more-industries" */
      "./chapters/more-industries.md")
  }
];

const storyViewsSwitch = ofWhich(...stories.map(a => [a.page, a.import]));

const makePaginationStub = () => ({
  isNew: true
});

const initPaginationStates = stories.slice(1).reduce(
  (init, { page }) => ({
    ...init,
    [page]: makePaginationStub()
  }),
  {
    [stories[0].page]: Object.assign(makePaginationStub(), { isNew: false })
  }
);

const buttonIndexView = ({ page, label, pageState }) => {
  const { isNew } = pageState;
  return button(".index", { dataset: { page } }, [
    label,
    isNew ? sup("new") : null
  ]);
};

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
    .map(state => state.page)
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
      const { industries } = state;
      return section([
        h3("Stories"),
        div(".story", [
          nav(".table-of-contents.tab-nav", [
            h4("Contents"),
            ...stories
              .filter(a => a.condition(industries))
              .map(a => set(a, "pageState", pagination.states[a.page]))
              .map(buttonIndexView)
          ]),
          story ? div(".chapter", { props: { innerHTML: story } }) : loading
        ])
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
