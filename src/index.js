import { run } from "@cycle/run";
import xs from "xstream";
import debounce from "xstream/extra/debounce";
import { div, button, h1, h4, a, makeDOMDriver } from "@cycle/dom";
import { makeHTTPDriver } from "@cycle/http";

import { set } from "../util";
import { INDUSTRY_KEYS, INDUSTRIES_STUB } from "../constant";
import { makeWebSocketDriver } from "./web-socket-driver";

const tap = (ex, x) => (console.log(ex, x), x);

const periodicUpdates = sources => {
  const userUpdater$ = sources.Socket.filter(p => p.type === "USER").map(
    ({ payload }) => state => set(state, "user", payload)
  );

  const industriesUpdater$ = sources.Socket.filter(
    p => p.type === "INDUSTRY"
  ).map(({ payload: { industryName, industry } }) => state =>
    set(state, ["industries", industryName], industry)
  );

  return {
    userUpdater$,
    industriesUpdater$
  };
};

function intent(sources) {
  const click$ = xs.merge(
    ...INDUSTRY_KEYS.map(industryName =>
      sources.DOM.select(`.industry .${industryName} .employ`)
        .events("click")
        .mapTo({ type: "INDUSTRY#EMPLOY", payload: { industryName } })
    ),
    ...INDUSTRY_KEYS.map(industryName =>
      sources.DOM.select(`.industry .${industryName} .layoff`)
        .events("click")
        .mapTo({ type: "INDUSTRY#LAYOFF", payload: { industryName } })
    )
  );
  return { click$ };
}

function reducers(sources, action$) {
  const clickReducer$ = action$
    .filter(action => /^INDUSTRY/.test(action.type))
    .map(action => state => {
      const buttonAction = action.type.replace(/INDUSTRY#/, "");
      const {
        payload: { industryName }
      } = action;
      switch (buttonAction) {
        case "LAYOFF":
        case "EMPLOY":
          const buttonType = buttonAction.toLowerCase();
          return set(
            state,
            ["buttonState", industryName, buttonType, "attrs", "disabled"],
            true
          );
        default:
          new Error("not impl");
      }
    });
  return xs.merge(clickReducer$);
}

const initialState = {
  user: { points: "...", population: "...", lastSaveDate: "..." },
  industries: INDUSTRIES_STUB,
  buttonState: INDUSTRY_KEYS.reduce(
    (buttonState, key) => ({
      ...buttonState,
      [key]: {
        employ: { attrs: { disabled: false } },
        layoff: { attrs: { disabled: false } }
      }
    }),
    {}
  )
};

/**
 * TODO: buttonState disabled timeouts
 */

function main(sources) {
  const { userUpdater$, industriesUpdater$ } = periodicUpdates(sources);
  const { click$ } = intent(sources);
  const reducer$ = reducers(sources, xs.merge(click$));

  const socket$ = click$;

  const state$ = xs
    .merge(userUpdater$, industriesUpdater$, reducer$)
    .fold((acc, reducer) => reducer(acc), initialState);

  const vdom$ = state$.map(
    ({ user: { points, population, lastSaveDate }, industries, buttonState }) =>
      div(".container", [
        div(".user", [
          div(".date", ["last save: ", lastSaveDate]),
          div(".points", ("points", points)),
          div(".population", ("population", population))
        ]),
        div(
          ".industry",
          INDUSTRY_KEYS.map(key =>
            div(`.${key}`, [
              key,
              " ",
              div(industries[key].supply),
              div(industries[key].allocation),
              button(".layoff", buttonState[key].layoff, "Layoff"),
              button(".employ", buttonState[key].employ, "Employ")
            ])
          )
        )
      ])
  );

  return { DOM: vdom$, Socket: socket$ };
}

run(main, {
  DOM: makeDOMDriver("#root"),
  Socket: makeWebSocketDriver()
});

if (module.hot) {
  module.hot.accept();
}
