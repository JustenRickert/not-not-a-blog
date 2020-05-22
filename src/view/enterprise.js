import xs from "xstream";
import { div } from "@cycle/dom";

import { cases } from "../../util";

import UserInformationEntry from "./enterprise-events/user-information-entry";

const routes = {
  "user-information-entry": {
    label: "Information Entry",
    View: UserInformationEntry
  }
};

const routeSwitch = cases(
  ...Object.entries(routes).map(([key, { View }]) => [key, View]),
  () => ({ dom: xs.of(div("TODO")) })
);

function Enterprise(sources) {
  const sinks$ = sources.route.stream
    .map(route => routeSwitch(route.enterprise))
    .map(View => View(sources));

  return {
    dom: sinks$.map(s => s.dom).flatten(),
    state: sinks$.map(s => s.state || xs.empty()).flatten(),
    route: sinks$.map(s => s.route || xs.empty()).flatten()
  };
}

export default Enterprise;
