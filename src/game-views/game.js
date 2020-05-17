import xs from "xstream";
import isolate from "@cycle/isolate";
import { button, br, div, form, label, input } from "@cycle/dom";

import { GAME_UPDATE_UNLOCK_CONDITION, TIMEOUT } from "../constant";
import { whole } from "../format";

const perSecond = n => {
  if (n < 0.001) n = 0;
  n = (1e3 * n) / TIMEOUT;
  n = n.toLocaleString(undefined, {
    maximumSignificantDigits: 2
  });
  return n + "/s";
};

const resourceView = (state, { resourceName, label }) => {
  const predicate = GAME_UPDATE_UNLOCK_CONDITION.resources[resourceName];
  if (!predicate(state)) return null;
  return div([
    label,
    ": ",
    whole(state.resources[resourceName]),
    "+",
    perSecond(state.updateRates.resources[resourceName])
  ]);
};

function UserStats(sources) {
  const dom$ = sources.state.stream.map(state => {
    const {
      population,
      userInformation: { name, planet },
      updateRates
    } = state;
    return div(".user-stats", [
      div(["Name: ", name]),
      div(["Planet: ", planet]),
      div([
        "Population: ",
        whole(population),
        "+",
        perSecond(updateRates.population)
      ]),
      resourceView(state, { resourceName: "stones", label: "Stones" }),
      resourceView(state, { resourceName: "wood", label: "Wood" }),
      resourceView(state, { resourceName: "metals", label: "Metals" }),
      resourceView(state, { resourceName: "science", label: "Science" }),
      resourceView(state, { resourceName: "art", label: "Art" })
    ]);
  });

  return {
    DOM: dom$
  };
}

function Game(sources) {
  const userStatsSinks = UserStats(sources);

  const dom$ = userStatsSinks.DOM;

  return {
    DOM: dom$,
    state: xs.never()
  };
}

export default isolate(Game, { state: null });
