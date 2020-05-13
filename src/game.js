import xs from "xstream";
import isolate from "@cycle/isolate";
import { button, br, div, form, label, input } from "@cycle/dom";

import { updateAll, ofWhich } from "../util";

import makeUpdateReducer from "./game-update";

import "./game.css";

function UserInformationEntry(sources) {
  const submit$ = sources.DOM.select(".user-entry")
    .events("submit", {
      preventDefault: true
    })
    .map(({ currentTarget: { elements: { name, planet } } }) => ({
      name: name.value,
      planet: planet.value
    }));

  const dom$ = xs.of(
    form(".user-entry", [
      div(label({ attrs: { for: "user-name" } }, "Name")),
      div(
        input({
          attrs: {
            id: "user-name",
            name: "name",
            required: true
          }
        })
      ),
      br(),
      div(label({ attrs: { for: "user-assignment" } }, "Planet")),
      div(
        input({
          attrs: {
            id: "user-assignment",
            name: "planet",
            required: true
          }
        })
      ),
      br(),
      div(button({ attrs: { type: "sumbit" } }, "submit"))
    ])
  );

  const reducer$ = submit$.map(userInformation => state =>
    updateAll(state, [
      ["userInformation", () => userInformation],
      ["currentPanel", () => "story"],
      ["currentChapter", () => "next-steps"],
      ["viewedChapters", texts => texts.concat("next-steps")],
      ["currentGameView", () => "user-stats"]
    ])
  );

  return {
    DOM: dom$,
    state: reducer$
  };
}

function UserStats(sources) {
  const dom$ = sources.state.stream.map(state => {
    const {
      population,
      resources,
      userInformation: { name, planet }
    } = state;
    return div(".user-stats", [
      div(["Name: ", name]),
      div(["Planet: ", planet]),
      div(["Population: ", population]),
      div(["Stones: ", resources.stones]),
      div(["Wood: ", resources.wood]),
      div(["Metals: ", resources.metals])
    ]);
  });

  return {
    DOM: dom$
  };
}

const switchComponent = ofWhich(
  [
    "user-information-entry",
    () => isolate(UserInformationEntry, { state: null })
  ],
  ["user-stats", () => isolate(UserStats, { state: null })],
  () => () => xs.of(div("TODO: Not implemented"))
);

function Game(sources) {
  const viewSinks$ = sources.state.stream
    .map(state => state.currentGameView)
    .map(switchComponent)
    .map(View => View(sources));

  const dom$ = viewSinks$.map(sinks => sinks.DOM).flatten();

  const reducer$ = xs.merge(
    viewSinks$.map(sinks => sinks.state || xs.empty()).flatten(),
    makeUpdateReducer(sources)
  );

  return {
    DOM: dom$,
    state: reducer$
  };
}

export default isolate(Game, { state: null });
