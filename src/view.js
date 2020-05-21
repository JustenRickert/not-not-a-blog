import xs from "xstream";
import isolate from "@cycle/isolate";
import dropRepeats from "xstream/extra/dropRepeats";
import { set, cases, omit } from "../util";
import { div, h2, br, section } from "@cycle/dom";

import { tabButtons } from "./shared";
import GameViewSwitch from "./game";
import Upgrade from "./upgrade";
import Story from "./story";
import { computeGameUpdateRates } from "./game-update";

import "./view.css";

function View(sources) {
  const currentPanel$ = sources.state.stream
    .map(state => state.currentPanel)
    .compose(dropRepeats());

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
    panelAction$.map(id => state => set(state, "currentPanel", id)),
    storySinks.state,
    gameSinks.state,
    upgradeSinks.state
  );

  return {
    DOM: dom$,
    state: reducer$
  };
}

export default isolate(View, {
  state: {
    get: state => ({
      ...state,
      updateRates: computeGameUpdateRates(state)
    }),
    set: (_, state) => omit(state, ["updateRates"])
  }
});
