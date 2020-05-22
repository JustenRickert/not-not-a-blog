import xs from "xstream";
import sampleCombine from "xstream/extra/sampleCombine";
import { withState } from "@cycle/state";
import { button, div } from "@cycle/dom";

import { cases, set } from "../util";
import Story from "./view/story";
import Enterprise from "./view/enterprise";

const routes = {
  story: { label: "Story", View: Story },
  enterprise: { label: "Enterprise", View: Enterprise }
};

const routeSwitch = cases(
  ...Object.entries(routes).map(([key, { View }]) => [key, View])
);

function view(sources, routeDom$) {
  const tabs$ = sources.route.stream.map(state =>
    div(
      ".route-tabs",
      Object.entries(routes).map(([key, { label }]) =>
        button(
          {
            dataset: { id: key },
            style: {
              backgroundColor: key === state.route ? "yellow" : undefined
            }
          },
          label
        )
      )
    )
  );
  return xs.combine(tabs$, routeDom$).map(([tabs, dom]) => div([tabs, dom]));
}

function intent(sources) {
  const tabAction$ = sources.dom
    .select(".route-tabs button")
    .events("click")
    .map(e => e.ownerTarget.dataset.id);
  return { tabAction$ };
}

const routeInit = xs.of(() => ({
  route: "story",
  story: "introduction",
  enterprise: "user-information-entry"
}));

function Routing(sources) {
  sources.route.stream.addListener({
    // next: console.log,
    error: console.error
  });
  const sinks$ = sources.route.stream
    .map(state => routeSwitch(state.route))
    .map(View => View(sources));

  const dom$ = view(sources, sinks$.map(s => s.dom).flatten());
  const { tabAction$ } = intent(sources);

  const routeReducer$ = xs.merge(
    routeInit,
    tabAction$.map(id => state => set(state, "route", id)),
    sinks$.map(s => s.route || xs.empty()).flatten()
  );

  return {
    dom: dom$,
    state: sinks$.map(s => s.state || xs.empty()).flatten(),
    route: routeReducer$
  };
}

export default withState(Routing, "route");
