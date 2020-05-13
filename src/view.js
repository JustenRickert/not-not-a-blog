import xs from "xstream";
import dropRepeats from "xstream/extra/dropRepeats";
import { set, cases, updateAll } from "../util";
import { div, h2, nav, section, button, sup } from "@cycle/dom";

import { makeTextView, chapters } from "./text";
import Game from "./game";
import Upgrade from "./upgrade";

import "./view.css";

export default function View(sources) {
  const storyAction$ = sources.DOM.select(".story .table-of-contents button")
    .events("click")
    .map(e => ({
      id: e.currentTarget.dataset.id
    }));

  const chapter$ = sources.state.stream
    .map(state => state.currentChapter)
    .compose(dropRepeats())
    .map(makeTextView)
    .flatten();

  const story$ = xs
    .combine(sources.state.stream, chapter$)
    .map(([state, chapter]) => [
      h2(".panel-header", "Story"),
      div(".story", [
        nav(
          ".tabs.table-of-contents",
          chapters
            .filter(c => c.condition(state))
            .map(({ id, label }) =>
              button({ dataset: { id } }, [
                label,
                !state.viewedChapters.includes(id) ? sup("new") : null
              ])
            )
        ),
        chapter
      ])
    ]);

  const gameSinks = Game(sources);
  const upgradeSinks = Upgrade(sources);

  const game$ = gameSinks.DOM.map(dom =>
    div([h2(".panel-header", "Game"), dom])
  );

  const upgrade$ = upgradeSinks.DOM.map(dom =>
    div([h2(".panel-header", "Upgrade"), dom])
  );

  const view$ = sources.state.stream
    .map(state => state.currentPanel)
    .compose(dropRepeats())
    .map(cases(["game", game$], ["story", story$], ["upgrade", upgrade$]))
    .flatten();

  const panelAction$ = sources.DOM.select(".view .horizontal-tabs button")
    .events("click")
    .map(e => ({
      id: e.currentTarget.dataset.id
    }));

  const dom$ = view$.map(view => {
    return div(".view", [
      section(".tabs.horizontal-tabs", [
        button({ dataset: { id: "story" } }, "story"),
        button({ dataset: { id: "game" } }, "game"),
        button({ dataset: { id: "upgrade" } }, "upgrade")
      ]),
      section(".panel", view)
    ]);
  });

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
