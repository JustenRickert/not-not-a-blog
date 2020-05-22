import xs from "xstream";
import isolate from "@cycle/isolate";
import { withState } from "@cycle/state";
import { div, h2, br, section } from "@cycle/dom";

import { set, cases, omit } from "../util";
import { tabButtons } from "./shared";
import GameViewSwitch from "./game";
import Upgrade from "./upgrade";
import Story from "./story";
import { computeGameUpdateRates } from "./game-update";

import "./view.css";

function View(sources) {
  const currentPanel$ = sources.local.stream.map(state => state.currentPanel);

  const switchTabs = tabButtons([
    { id: "story" },
    { id: "game" },
    { id: "upgrade" }
  ]);

  const tabs$ = currentPanel$
    .map(switchTabs)
    .map(tabs => section(".tabs.horizontal-tabs", tabs));

  const storySinks = Story(sources);
  const gameSinks = GameViewSwitch(sources);
  const upgradeSinks = Upgrade(sources);

  const view$ = currentPanel$
    .map(
      cases(
        ["game", gameSinks.DOM],
        ["story", storySinks.DOM],
        ["upgrade", upgradeSinks.DOM]
      )
    )
    .flatten();

  const dom$ = xs
    .combine(currentPanel$, tabs$, view$)
    .map(([currentPanel, tabs, view]) => {
      return div(".view", [
        h2(".panel-header", currentPanel),
        tabs,
        br(),
        section(".panel", view)
      ]);
    });

  const panelAction$ = sources.DOM.select(".view .horizontal-tabs button")
    .events("click")
    .map(e => e.currentTarget.dataset.id);

  const reducer$ = xs.merge(
    storySinks.state,
    gameSinks.state,
    upgradeSinks.state
  );

  const localReducer$ = xs.merge(
    xs.of(() => ({ currentPanel: "story" })),
    panelAction$.map(id => state => set(state, "currentPanel", id))
  );

  return {
    DOM: dom$,
    state: reducer$,
    local: localReducer$
  };
}

export default isolate(withState(View, "local"), {
  state: {
    get: state => ({
      ...state,
      updateRates: computeGameUpdateRates(state)
    }),
    set: (_, state) => omit(state, ["updateRates"])
  }
});
