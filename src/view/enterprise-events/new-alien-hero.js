import xs from "xstream";
import isolate from "@cycle/isolate";
import { button, br, div, form, h2, label, input } from "@cycle/dom";

import { updateAll, set } from "../../../util";

function NewAlienHero(sources) {
  const dom$ = xs.of(
    form(".user-entry", [
      h2("New Alien Hero"),
      div(label({ attrs: { for: "newAlienHero" } }, "An Alien Hero's Name")),
      div(
        input({
          attrs: { id: "newAlienHero", required: true }
        })
      ),
      br(),
      div(button({ attrs: { type: "sumbit" } }, "submit"))
    ])
  );

  const submit$ = sources.dom
    .select(".user-entry")
    .events("submit", {
      preventDefault: true
    })
    .map(({ ownerTarget: { elements: { newAlienHero } } }) => ({
      newAlienHero: newAlienHero.value
    }));

  return {
    dom: dom$,
    state: submit$.map(({ newAlienHero }) => state =>
      set(state, "userInformation.newAlienHero", newAlienHero)
    ),
    route: submit$.mapTo(route => set(route, "enterprise", null))
  };
}

export default isolate(NewAlienHero, { state: null, route: null });
