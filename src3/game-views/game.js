import xs from "xstream";
import isolate from "@cycle/isolate";
import { withState } from "@cycle/state";
import { div, h3, section } from "@cycle/dom";

import { tabButtons } from "../shared";
import { ofWhich, set } from "../../util";
import UserStats from "./user-stats";
import Enterprise from "./enterprise";

import "./game.css";

// TODO consider lazy imports here
const gamePanels = [
  { id: "stats", label: "Stats", view: () => UserStats },
  {
    id: "enterprise",
    label: "Enterprise",
    view: () => Enterprise
  }
];

const gamePanelLabels = gamePanels.reduce(
  (acc, { id, label }) => ({ ...acc, [id]: label }),
  {}
);

const sinkSwitch = ofWhich(...gamePanels.map(p => [p.id, p.view]));

function Game(sources) {
  const currentGamePanel$ = sources.local.stream.map(
    local => local.currentGamePanel
  );

  sources.local.stream.addListener({
    next: state => localStorage.setItem("game-local", JSON.stringify(state))
  });

  const tabs$ = currentGamePanel$
    .map(tabButtons(gamePanels))
    .map(tabs => section(".tabs.table-of-contents", tabs));

  const sinks$ = currentGamePanel$.map(sinkSwitch).map(View => View(sources));

  const dom$ = xs
    .combine(currentGamePanel$, tabs$, sinks$.map(s => s.DOM).flatten())
    .map(([currentGamePanel, tabs, view]) =>
      div(".game", [
        tabs,
        div(".game-panel", [h3(gamePanelLabels[currentGamePanel]), view])
      ])
    );

  const panelAction$ = sources.DOM.select(".game .tabs button")
    .events("click")
    .map(e => e.currentTarget.dataset.id);

  const initLocalReducer$ = xs.of(
    () =>
      JSON.parse(localStorage.getItem("game-local")) || {
        currentGamePanel: "stats"
      }
  );

  const reducer$ = xs.merge(
    sinks$
      .map(sinks => sinks.state || xs.empty()) // why need empty?
      .flatten()
  );

  return {
    DOM: dom$,
    state: reducer$,
    local: xs.merge(
      initLocalReducer$,
      panelAction$.map(id => local => set(local, "currentGamePanel", id))
    )
  };
}

export default isolate(withState(Game, "local"), { state: null });
