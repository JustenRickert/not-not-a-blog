import xs from "xstream";
import { div, h3 } from "@cycle/dom";

import { cases } from "../../util";
import UserInformationEntry from "./enterprise-events/user-information-entry";
import Market from "./enterprise-industry/market";
import { decimal, whole } from "../format";

import "./enterprise.css";

function renderStats(state) {
  const { points, industry } = state;
  const unlockedIndustries = Object.entries(industry).filter(([, { stock }]) =>
    Boolean(stock)
  );
  if (!unlockedIndustries.length) return null;
  return div(".stats", [
    div(".table", [
      div(".table-row", [
        div(".table-item", h3("Industry")),
        div(".table-item", h3("Supply")),
        div(".table-item", h3("Stocks"))
      ]),
      ...unlockedIndustries.map(([key, { supply, stock }]) =>
        div(".table-row", [
          div(".table-item", key),
          div(".table-item", whole(supply)),
          div(".table-item", whole(stock))
        ])
      )
    ])
  ]);
}

function Stats(sources) {
  const marketSinks = Market(sources);

  const dom$ = xs
    .combine(sources.state.stream, marketSinks.dom)
    .map(([state, marketDom]) => div([renderStats(state), marketDom]));

  return {
    dom: dom$,
    state: marketSinks.state
  };
}

const eventRoutes = {
  "user-information-entry": {
    label: "Information Entry",
    View: UserInformationEntry
  }
};

const routeSwitch = cases(
  ...Object.entries(eventRoutes).map(([key, { View }]) => [key, View]),
  Stats
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
