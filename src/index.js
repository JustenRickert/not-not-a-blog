import { run } from "@cycle/run";
import { timeDriver } from "@cycle/time";
import xs from "xstream";
import debounce from "xstream/extra/debounce";
import flattenConcurrently from "xstream/extra/flattenConcurrently";
import {
  div,
  button,
  h1,
  h2,
  h3,
  h4,
  a,
  span,
  makeDOMDriver
} from "@cycle/dom";
import { makeHTTPDriver } from "@cycle/http";

import { set, update, industrySupplyDerivative } from "../util";
import { INDUSTRY_KEYS, INDUSTRIES_STUB } from "../constant";
import { makeWebSocketDriver } from "./web-socket-driver";

import "./style.css";

const employTimeout = 15e3;
const layoffTimeout = 10e3;

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
        const sinceLastLayoff =
          Date.now() -
          new Date(industries[industryName].lastLayoffDate).getTime();
        const sinceLastEmploy =
          Date.now() -
          new Date(industries[industryName].lastEmployDate).getTime();
        return {
          industryName,
          layoff: {
            timeout: Math.max(0, layoffTimeout - sinceLastLayoff)
          },
          employ: {
            timeout: Math.max(0, employTimeout - sinceLastEmploy)
          }
        };
      })
    )
    .map(industryTimeouts =>
      xs.merge(
        ...industryTimeouts.map(({ industryName, layoff, employ }) =>
          xs.merge(
            xs
              .of([industryName, "layoff"])
              .compose(sources.Time.delay(layoff.timeout)),
            xs
              .of([industryName, "employ"])
              .compose(sources.Time.delay(employ.timeout))
          )
        )
      )
    )
    .flatten()
    .map(([industryName, buttonType]) => state =>
      set(
        state,
        ["buttonState", industryName, buttonType, "attrs", "disabled"],
        false
      )
    );

  const industriesButtonStateUpdater$ = sources.Socket.filter(
    action =>
      action.type === "INDUSTRY" &&
      ["INDUSTRY#EMPLOY", "INDUSTRY#LAYOFF"].some(
        reason => reason === action.reason
      )
  )
    .map(action => {
      const buttonType = action.reason.replace(/INDUSTRY#/, "").toLowerCase();
      return xs
        .of([action.payload.industryName, buttonType])
        .compose(
          sources.Time.delay(
            buttonType === "layoff" ? layoffTimeout : employTimeout
          )
        );
    })
    .compose(flattenConcurrently)
    .map(([industryName, buttonType]) => state =>
      set(
        state,
        ["buttonState", industryName, buttonType, "attrs", "disabled"],
        false
      )
    );

  return {
    userUpdater$,
    industriesUpdater$,
    buttonStateUpdater$: xs.merge(
      industriesButtonStateInitializer$,
      industriesButtonStateUpdater$
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

const toPercentage = n => (100 * n).toPrecision(2) + "%";

const toWhole = n => Math.floor(n).toLocaleString();

const withPlus = s => (/^-/.test(s) ? s : "+" + s);

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

  const derivatives$ = state$.map(state => {
    const derivatives = INDUSTRY_KEYS.reduce(
      (acc, industryName) => ({
        ...acc,
        [industryName]: industrySupplyDerivative(industryName, state.industries)
      }),
      {}
    );
    const derivativeSums = Object.values(derivatives).reduce(
      (derivativeSums, derivatives) =>
        Object.entries(derivatives).reduce(
          (derivativeSums, [industryName, derivative]) => ({
            ...derivativeSums,
            [industryName]: derivativeSums[industryName] + derivative
          }),
          derivativeSums
        ),
      INDUSTRY_KEYS.reduce((zeros, key) => ({ ...zeros, [key]: 0 }), {})
    );
    return {
      derivatives,
      derivativeSums
    };
  });

  const vdom$ = xs
    .combine(state$, derivatives$)
    .map(
      ([
        {
          user: { points, population, lastSaveDate },
          industries,
          buttonState
        },
        { derivatives, derivativeSums }
      ]) =>
        div(".container", [
          div(".user", [
            h2(".user-header", "User"),
            div(".user-stats", [
              div(".points", ["points", " ", toWhole(points)]),
              div(".population", ["population", " ", toWhole(population)])
            ])
          ]),
          div(".industry", [
            h2(".industry-header", "Industry"),
            div(
              INDUSTRY_KEYS.map(industryName => {
                const derivative = industrySupplyDerivative(
                  industryName,
                  industries
                );
                const industry = industries[industryName];
                const {
                  [industryName]: { layoff: layoffAttrs, employ: employAttrs }
                } = buttonState;
                return div(`.${industryName}`, [
                  h3(industryName),
                  div(".industry-stats", [
                    div([
                      "supply",
                      " ",
                      toWhole(industry.supply),
                      " ",
                      `${withPlus(toWhole(derivativeSums[industryName]))}/s`
                    ]),
                    div([
                      "employment ",
                      toWhole(industry.allocation),
                      " ",
                      `(${toPercentage(industry.allocation / population)})`
                    ])
                  ]),
                  div(".industry-actions", [
                    button(".layoff", layoffAttrs, "Layoff"),
                    button(".employ", employAttrs, "Employ")
                  ])
                ]);
              })
            )
          ])
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
