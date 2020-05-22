import xs from "xstream";
import isolate from "@cycle/isolate";
import { button, br, div, form, label, input } from "@cycle/dom";

import { updateAll } from "../../util";

function UserInformationEntry(sources) {
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

  const submit$ = sources.DOM.select(".user-entry button")
    .events("click", {
      preventDefault: true
    })
    .map(({ ownerTarget: { form: { elements: { name, planet } } } }) => ({
      name: name.value,
      planet: planet.value
    }));

  const reducer$ = submit$.map(userInformation => state =>
    updateAll(state, [
      ["userInformation", () => userInformation],
      ["currentPanel", () => "story"],
      ["currentChapter", () => "next-steps"],
      ["viewedChapters", texts => texts.concat("next-steps")],
      ["currentGameView", () => "game"]
    ])
  );

  return {
    DOM: dom$,
    state: reducer$
  };
}

export default isolate(UserInformationEntry, { state: null });
