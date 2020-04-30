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
  ul,
  li,
  span,
  makeDOMDriver
} from "@cycle/dom";
import { makeHTTPDriver } from "@cycle/http";

import { set, update, industrySupplyDerivative } from "../util";
import { INDUSTRY_KEYS, INDUSTRIES_STUB, INDUSTRY_LABELS } from "../constant";
import { makeWebSocketDriver } from "./web-socket-driver";

import "./style.css";

const tap = x => (console.log(x), x);

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
    ),
    ...INDUSTRY_KEYS.map(industryName =>
      sources.DOM.select(
        [
          ".industry",
          `.${industryName}`,
          ".effects-derivative-stats-button"
        ].join(" ")
      )
        .events("click")
        .mapTo({
          type: "INDUSTRY#EFFECTS_DERIVATIVE_STATS",
          payload: { industryName }
        })
    ),
    ...INDUSTRY_KEYS.map(industryName =>
      sources.DOM.select(
        [
          ".industry",
          `.${industryName}`,
          ".breakdown-derivative-stats-button"
        ].join(" ")
      )
        .events("click")
        .mapTo({
          type: "INDUSTRY#BREAKDOWN_DERIVATIVE_STATS",
          payload: { industryName }
        })
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
        case "BREAKDOWN_DERIVATIVE_STATS":
        case "EFFECTS_DERIVATIVE_STATS": {
          const buttonType = buttonAction.includes("BREAKDOWN")
            ? "breakdown"
            : "effects";
          return update(
            state,
            ["buttonState", industryName, "derivatives", "shown"],
            shown => (shown === buttonType ? "" : buttonType)
          );
        }
        case "LAYOFF": // pass
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
      layoff: { attrs: { disabled: true } },
      derivatives: { shown: "" }
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

const toDecimal = n => Number(n).toFixed(1);

const withPlus = s => (/^-/.test(s) ? s : "+" + s);

function main(sources) {
  const {
    userUpdater$,
    industriesUpdater$,
    buttonStateUpdater$
  } = periodicUpdates(sources);
  const { click$ } = intent(sources);
  const reducer$ = reducers(sources, xs.merge(click$));

  const socket$ = click$.filter(p => /INDUSTRY#(EMPLOY|LAYOFF)/.test(p.type));

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

  const stats$ = state$.map(state => {
    const employed = Object.values(state.industries).reduce(
      (employed, industry) => employed + industry.allocation,
      0
    );
    const unemployed = state.user.population - employed;
    return {
      employed,
      unemployed
    };
  });

  const vdom$ = xs
    .combine(state$, derivatives$, stats$)
    .map(
      ([
        {
          user: { points, population, lastSaveDate },
          industries,
          buttonState
        },
        { derivatives, derivativeSums },
        { employed, unemployed }
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
          div(".industry", [
            h2(".industry-header", "Industry"),
            div(
              INDUSTRY_KEYS.map(industryName => {
                const industry = industries[industryName];
                const {
                  [industryName]: {
                    layoff: layoffAttrs,
                    employ: employAttrs,
                    derivatives: { shown: shownDerivative }
                  }
                } = buttonState;
                const inputDerivative = derivatives[industryName];
                const derivativeBreakdown = Object.entries(derivatives)
                  .filter(
                    ([, derivative]) =>
                      typeof derivative[industryName] !== "undefined"
                  )
                  .reduce(
                    (derivativeBreakdown, [otherIndustryName, derivative]) => ({
                      ...derivativeBreakdown,
                      [otherIndustryName]: derivative[industryName]
                    }),
                    {}
                  );
                return div(`.${industryName}`, [
                  h3(INDUSTRY_LABELS[industryName]),
                  div(".industry-stats", [
                    div([
                      "supply",
                      " ",
                      toWhole(industry.supply),
                      " ",
                      withPlus(toDecimal(derivativeSums[industryName])) + "/s"
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
                    button(".employ", employAttrs, "Employ"),
                    button(".effects-derivative-stats-button", "Effects"),
                    button(".breakdown-derivative-stats-button", "Breakdown")
                  ]),
                  div(
                    [".derivative-stats", !shownDerivative && ".hidden"]
                      .filter(Boolean)
                      .join(" "),
                    ul(
                      Object.entries(
                        shownDerivative === "effects"
                          ? inputDerivative
                          : derivativeBreakdown
                      ).map(([otherIndustryName, cost]) =>
                        li([
                          otherIndustryName,
                          " ",
                          `${withPlus(toDecimal(cost))}/s`
                        ])
                      )
                    )
                  )
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
