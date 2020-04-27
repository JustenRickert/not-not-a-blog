import { run } from "@cycle/run";
import { timeDriver } from "@cycle/time";
import xs from "xstream";
import debounce from "xstream/extra/debounce";
import { div, button, h1, h4, a, makeDOMDriver } from "@cycle/dom";
import { makeHTTPDriver } from "@cycle/http";

import { set, update } from "../util";
import { INDUSTRY_KEYS, INDUSTRIES_STUB } from "../constant";
import { makeWebSocketDriver } from "./web-socket-driver";

const tap = (ex, x) => (console.log(ex, x), x);

const employTimeout = 5e3;

// TODO?
// const serializeIndustriesDates = industries =>
//   Object.entries(industries).reduce(
//     (
//       industries,
//       [
//         industryName,
//         { lastEmployDate, lastLayoffDate, lastUpdateSupplyDate, ...industry }
//       ]
//     ) => ({
//       ...industries,
//       [industryName]: {
//         ...industry,
//         lastEmployDate: new Date(lastEmployDate),
//         lastLayoffDate: new Date(lastLayoffDate),
//         lastUpdateSupplyDate: new Date(lastUpdateSupplyDate)
//       }
//     }),
//     {}
//   );

const periodicUpdates = sources => {
  const userUpdater$ = sources.Socket.filter(p => p.type === "USER").map(
    ({ payload }) => state => set(state, "user", payload)
  );

  const industries$ = sources.Socket.filter(p => p.type === "INDUSTRY");

  const industriesUpdater$ = industries$.map(
    ({ payload: { industries: updatedIndustries } }) => state =>
      update(state, ["industries"], industries => ({
        ...industries,
        ...updatedIndustries
      }))
  );

  const industriesButtonStateInitializer$ = industries$
    .take(1)
    .map(({ payload: { industries } }) =>
      INDUSTRY_KEYS.map(industryName => {
        const sinceLast =
          Date.now() -
          new Date(industries[industryName].lastEmployDate).getTime();
        return [industryName, Math.max(0, employTimeout - sinceLast)];
      })
    )
    .map(industryTimeouts =>
      xs.merge(
        ...industryTimeouts.map(([industryName, timeout]) =>
          xs.of(industryName).compose(sources.Time.delay(timeout))
        )
      )
    )
    .flatten()
    .map(industryName => state =>
      set(
        state,
        ["buttonState", industryName, "employ", "attrs", "disabled"],
        false
      )
    );

  const employButtonStateUpdater$ = sources.Socket.filter(
    p => p.type === "INDUSTRY" && p.reason === "INDUSTRY#EMPLOY"
  )
    .compose(sources.Time.delay(employTimeout))
    .map(({ payload: { industryName } }) => state =>
      set(
        state,
        ["buttonState", industryName, "employ", "attrs", "disabled"],
        false
      )
    );

  return {
    userUpdater$,
    industriesUpdater$,
    buttonStateUpdater$: xs.merge(
      industriesButtonStateInitializer$,
      employButtonStateUpdater$
    )
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

const initialButtonState = INDUSTRY_KEYS.reduce(
  (buttonState, industryName) => ({
    ...buttonState,
    [industryName]: {
      employ: { attrs: { disabled: true } },
      layoff: { attrs: { disabled: true } }
    }
  }),
  {}
);

const initialState = {
  user: { points: "...", population: "...", lastSaveDate: "..." },
  industries: INDUSTRIES_STUB,
  buttonState: initialButtonState
};

/**
 * TODO: buttonState disabled timeouts
 */

function main(sources) {
  const {
    userUpdater$,
    industriesUpdater$,
    buttonStateUpdater$
  } = periodicUpdates(sources);
  const { click$ } = intent(sources);
  const reducer$ = reducers(sources, xs.merge(click$));

  const socket$ = click$;

  const state$ = xs
    .merge(userUpdater$, industriesUpdater$, reducer$, buttonStateUpdater$)
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
              div(["supply ", industries[key].supply]),
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
  Socket: makeWebSocketDriver(),
  Time: timeDriver
});

if (module.hot) {
  module.hot.accept();
}
