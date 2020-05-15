import xs from "xstream";
import dropRepeats from "xstream/extra/dropRepeats";
import { set, cases, updateAll } from "../util";
import { div, h2, nav, section, sup } from "@cycle/dom";

import { makeTextView, chapters } from "./text";
import { tabButtons } from "./shared";
import Game from "./game";
import Upgrade from "./upgrade";

import "./view.css";

export default function View(sources) {
  const currentChapter$ = sources.state.stream.map(
    state => state.currentChapter
  );

  const storyTabsSwitch$ = sources.state.stream.map(state =>
    tabButtons(
      chapters
        .filter(c => c.condition(state))
        .map(({ id, label }) => ({
          id,
          label: [label, !state.viewedChapters.includes(id) ? sup("new") : null]
        }))
    )
  );

  const storyTabs$ = xs
    .combine(storyTabsSwitch$, currentChapter$)
    .map(([storyTabsSwitch, currentChapter]) =>
      storyTabsSwitch(currentChapter)
    );

  const chapter$ = currentChapter$
    .compose(dropRepeats())
    .map(makeTextView)
    .flatten();

  const story$ = xs
    .combine(chapter$, storyTabs$)
    .map(([chapter, storyTabs]) => [
      h2(".panel-header", "Story"),
      div(".story", [nav(".tabs.table-of-contents", storyTabs), chapter])
    ]);

  const gameSinks = Game(sources);
  const upgradeSinks = Upgrade(sources);

  const game$ = gameSinks.DOM.map(dom =>
    div([h2(".panel-header", "Game"), dom])
  );

  const upgrade$ = upgradeSinks.DOM.map(dom =>
    div([h2(".panel-header", "Upgrade"), dom])
  );

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

  const view$ = currentPanel$
    .map(cases(["game", game$], ["story", story$], ["upgrade", upgrade$]))
    .flatten();

  const dom$ = xs.combine(tabs$, view$).map(([tabs, view]) => {
    return div(".view", [tabs, section(".panel", view)]);
  });

  const storyAction$ = sources.DOM.select(".story .table-of-contents button")
    .events("click")
    .map(e => ({
      id: e.currentTarget.dataset.id
    }));

  const panelAction$ = sources.DOM.select(".view .horizontal-tabs button")
    .events("click")
    .map(e => ({
      id: e.currentTarget.dataset.id
    }));

  const reducer$ = xs.merge(
    storyAction$.map(a => state =>
      updateAll(state, [
        ["currentChapter", () => a.id],
        [
          "viewedChapters",
          chapters =>
            chapters.includes(a.id) ? chapters : chapters.concat(a.id)
        ]
      ])
    ),
    panelAction$.map(a => state => set(state, "currentPanel", a.id)),
    gameSinks.state,
    upgradeSinks.state
  );

  return {
    DOM: dom$,
    state: reducer$
  };
}
