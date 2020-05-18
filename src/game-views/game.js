import xs from "xstream";
import dropRepeats from "xstream/extra/dropRepeats";
import isolate from "@cycle/isolate";
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
  const currentGamePanel$ = sources.state.stream.map(
    state => state.currentGamePanel
  );

  // TODO how do I avoid all the `dropRepeats`. lol irony.

  const tabs$ = currentGamePanel$
    .compose(dropRepeats())
    .map(tabButtons(gamePanels))
    .map(tabs => section(".tabs.table-of-contents", tabs));

  const sinks$ = currentGamePanel$
    .compose(dropRepeats())
    .map(sinkSwitch)
    .map(View => View(sources));

  const dom$ = xs
    .combine(
      currentGamePanel$.compose(dropRepeats()),
      tabs$,
      sinks$.map(s => s.DOM).flatten()
    )
    .map(([currentGamePanel, tabs, view]) =>
      div(".game", [
        tabs,
        div(".game-panel", [h3(gamePanelLabels[currentGamePanel]), view])
      ])
    );

  const panelAction$ = sources.DOM.select(".game .tabs button")
    .events("click")
    .map(e => e.currentTarget.dataset.id);

  const reducer$ = panelAction$.map(id => state =>
    set(state, "currentGamePanel", id)
  );

  return {
    DOM: dom$,
    state: reducer$
  };
}

export default isolate(Game, { state: null });
