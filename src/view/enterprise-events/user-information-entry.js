import xs from "xstream";
import isolate from "@cycle/isolate";
import { button, br, div, form, label, input } from "@cycle/dom";

import { updateAll, set } from "../../../util";

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

  const submit$ = sources.dom
    .select(".user-entry")
    .events("submit", {
      preventDefault: true
    })
    .map(({ ownerTarget: { elements: { name, planet } } }) => ({
      name: name.value,
      planet: planet.value
    }));

  const reducer$ = submit$.map(userInformation => state =>
    updateAll(state, [["userInformation", () => userInformation]])
  );

  const routeReducer$ = submit$.mapTo(route => set(route, "enterprise", null));

  return {
    dom: dom$,
    state: reducer$,
    route: routeReducer$
  };
}

export default isolate(UserInformationEntry, { state: null, route: null });
