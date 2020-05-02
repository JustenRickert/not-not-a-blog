import { run } from "@cycle/run";
import { timeDriver } from "@cycle/time";
import xs from "xstream";
import debounce from "xstream/extra/debounce";
import {
  div,
  button,
  h1,
  h2,
  h3,
  h4,
  a,
  ul,
  li,
  span,
  makeDOMDriver
} from "@cycle/dom";
import { makeHTTPDriver } from "@cycle/http";

import {
  set,
  update,
  industrySupplyDerivative,
  toWhole,
  toPercentage,
  withPlus,
  toDecimal
} from "../util";
import { INDUSTRY_KEYS, INDUSTRIES_STUB, INDUSTRY_LABELS } from "../constant";
import { makeWebSocketDriver } from "./web-socket-driver";
import Industries from "./industry";

import "./style.css";

const tap = x => (console.log(x), x);

const periodicUpdates = sources => {
  const userUpdater$ = sources.Socket.filter(p => p.type === "USER").map(
    ({ payload }) => state => ({ ...state, ...payload })
  );

  const industries$ = sources.Socket.filter(p => p.type === "INDUSTRY");

  const industriesUpdater$ = industries$.map(
    ({ payload: { industries: updatedIndustries } }) => industries => ({
      ...industries,
      ...updatedIndustries
    })
  );

  return {
    userUpdater$,
    industriesUpdater$
  };
};

const initialState = {
  user: { points: "...", population: "...", lastSaveDate: "..." },
  industries: INDUSTRIES_STUB
};

function main(sources) {
  const { userUpdater$, industriesUpdater$ } = periodicUpdates(sources);

  const user$ = userUpdater$.fold(
    (user, reducer) => reducer(user),
    initialState.user
  );

  const industries$ = industriesUpdater$.fold(
    (industries, reducer) => reducer(industries),
    initialState.industries
  );

  const industries = Industries({
    ...sources,
    props: {
      user: user$,
      industries: industries$
    }
  });

  const { DOM: industriesVDom$, action$: industriesAction$ } = industries;

  const socket$ = industriesAction$.filter(p =>
    /INDUSTRY#(EMPLOY|LAYOFF)/.test(p.type)
  );

  const stats$ = xs.combine(user$, industries$).map(([user, industries]) => {
    const employed = Object.values(industries).reduce(
      (employed, industry) => employed + industry.allocation,
      0
    );
    const unemployed = user.population - employed;
    return {
      employed,
      unemployed
    };
  });

  const vdom$ = xs
    .combine(user$, stats$, industriesVDom$)
    .map(
      ([
        { points, population, lastSaveDate },
        { employed, unemployed },
        industryVDom
      ]) =>
        div(".container", [
          div(".user", [
            h2(".user-header", "User"),
            div(".user-stats", [
              div(".points", ["points", " ", toWhole(points)]),
              div(".population", ["population", " ", toWhole(population)]),
              div(["unemployment", " ", toPercentage(unemployed / population)])
            ])
          ]),
          industryVDom
        ])
    );

  return { DOM: vdom$, Socket: socket$ };
}

run(main, {
  DOM: makeDOMDriver("#root"),
  Socket: makeWebSocketDriver(),
  Time: timeDriver
});

if (module.hot) {
  module.hot.accept();
}
