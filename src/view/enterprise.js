import xs from "xstream";
import { div, h2, h3, h4, section } from "@cycle/dom";

import { cases, which } from "../../util";
import { INDUSTRIES, STORY } from "../constant";
import UserInformationEntry from "./enterprise-events/user-information-entry";
import NewAlienHero from "./enterprise-events/new-alien-hero";
import Market from "./enterprise-industry/market";
import { whole } from "../format";

import "./enterprise.css";

function renderStats(state) {
  const { points, industry } = state;
  return div(".stats", [
    h2("Stats"),
    h3("Misc"),
    section(div(".points", [whole(points), " Points"])),
    h3("Industries"),
    section(".table", [
      div(".table-row.head", [
        div(".table-item", h4("Industry")),
        div(".table-item", h4("Supply")),
        div(".table-item", h4("Stocks"))
      ]),
      ...Object.entries(industry)
        .filter(([, { stock }]) => Boolean(stock))
        .map(([key, { supply, stock }]) =>
          div(".table-row", [
            div(".table-item", INDUSTRIES[key].label),
            div(".table-item.number", whole(supply)),
            div(".table-item.number", whole(stock))
          ])
        )
    ])
  ]);
}

function Stats(sources) {
  const marketSinks = Market(sources);

  const dom$ = xs
    .combine(sources.state.stream, marketSinks.dom)
    .map(([state, marketDom]) =>
      div(".enterprise", [renderStats(state), marketDom])
    );

  return {
    dom: dom$,
    state: marketSinks.state
  };
}

const eventRoutes = {
  "user-information-entry": {
    label: "Information Entry",
    view: UserInformationEntry
  },
  [STORY.newAlienHero.route]: {
    label: "New Alien Hero",
    view: NewAlienHero
  }
};

const routeSwitch = cases(
  ...Object.entries(eventRoutes).map(([key, { view }]) => [key, view]),
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
