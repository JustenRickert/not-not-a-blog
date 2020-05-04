import xs from "xstream";
import { div, button, h1, h2, h3, h4, a, ul, li, span } from "@cycle/dom";

import {
  makeEmploymentAction,
  makeIndustrySupplyUpdate
} from "./industry-util";
import { whole, plural, percentage, perSecond } from "./format";
import { TIMEOUTS } from "./constant";
import sampleCombine from "xstream/extra/sampleCombine";
import { updateAll } from "../util";

function intent(sources) {
  const employmentAction$ = makeEmploymentAction(sources, "housing");
  return xs.merge(employmentAction$);
}

function makeStateUpdate(sources) {
  const time = TIMEOUTS.industries.housing.timberToHouses;
  const timberToHousesDelta$ = xs
    .periodic(1e3 * time)
    .compose(sampleCombine(sources.state.stream))
    .map(([, { industries, derived: { derivative } }]) => {
      const maxUserHousesDelta = time * derivative.housing.user.houses;
      if (maxUserHousesDelta === 0)
        return {
          userHouses: 0,
          timberSupply: 0
        };
      const maxTimberSupplyDelta = time * derivative.housing.timber.supply;
      const ratio = Math.min(
        1,
        Math.abs(industries.timber.supply / maxTimberSupplyDelta)
      );
      return {
        ratio,
        userHouses: ratio * maxUserHousesDelta,
        timberSupply: ratio * maxTimberSupplyDelta
      };
    });
  const reducer$ = timberToHousesDelta$.map(
    ({ userHouses, timberSupply }) => state =>
      updateAll(state, [
        ["user.houses", houses => houses + userHouses],
        ["industries.timber.supply", supply => supply + timberSupply]
      ])
  );
  return {
    reducer: reducer$,
    timberToHousesDelta: timberToHousesDelta$
  };
}

function industriesUpdate(sources) {}

export default function Housing(sources) {
  const stateUpdateSinks = makeStateUpdate(sources);

  const notEnoughTimber$ = stateUpdateSinks.timberToHousesDelta.filter(
    ({ ratio }) => typeof ration === "number" && ration < 1
  );

  notEnoughTimber$.addListener({
    next: delta => {
      console.log("TODO");
      console.log(
        "There is not enough timber to support the amount of houses",
        "employed to produce it!",
        "Probably just want to show like an error or something"
      );
    }
  });

  const dom$ = sources.state.stream.map(
    ({
      user: { population },
      industries: {
        housing: { employed, unlocked }
      },
      derived: { derivative }
    }) => {
      if (!unlocked) return null;
      return div(".housing", [
        h3("Housing 🏠"),
        ul([
          li([
            whole(employed),
            " ",
            plural(employed, "worker", "workers"),
            ` (${percentage(employed / population)} of population)`
          ]),
          li(["houses ", perSecond(derivative.housing.user.houses)]),
          li(["timber ", perSecond(derivative.housing.timber.supply)])
        ]),
        button(".employ", "employ"),
        button(".layoff", "layoff")
      ]);
    }
  );

  const action$ = intent(sources);

  return {
    DOM: dom$,
    action: action$,
    state: stateUpdateSinks.reducer
  };
}
