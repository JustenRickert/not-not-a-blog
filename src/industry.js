import xs from "xstream";
import { div, button, h1, h2, h3, h4, a, ul, li, span } from "@cycle/dom";
import flattenConcurrently from "xstream/extra/flattenConcurrently";
import sampleCombine from "xstream/extra/sampleCombine";

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

const tap = (hella, x) => (console.log(hella, x), x);

const employTimeout = 15e3;
const layoffTimeout = 10e3;

const makeButtonStateUpdater = (sources, industryName) => {
  const buttonInitializer$ = sources.props.industry
    .drop(1) // Skip STUB state
    .take(1)
    .map(industry => {
      const now = Date.now();
      const sinceLastLayoff = now - new Date(industry.lastLayoffDate).getTime();
      const sinceLastEmploy = now - new Date(industry.lastEmployDate).getTime();
      return {
        layoffTimeout: layoffTimeout - sinceLastLayoff,
        employTimeout: employTimeout - sinceLastEmploy
      };
    })
    .map(({ layoffTimeout, employTimeout }) =>
      xs.merge(
        xs.of("layoff").compose(sources.Time.delay(layoffTimeout)),
        xs.of("employ").compose(sources.Time.delay(employTimeout))
      )
    )
    .flatten()
    .map(buttonType => state =>
      set(state, [buttonType, "attrs", "disabled"], false)
    );

  const buttonUpdater$ = sources.Socket.filter(
    action =>
      action.type === "INDUSTRY" &&
      industryName === action.payload.industryName &&
      ["INDUSTRY#EMPLOY", "INDUSTRY#LAYOFF"].some(
        reason => reason === action.reason
      )
  )
    .map(action => action.reason.replace(/INDUSTRY#/, "").toLowerCase())
    .compose(sampleCombine(sources.props.industry))
    .map(([buttonType, industry]) => {
      const now = Date.now();
      const last = new Date(
        buttonType === "layoff"
          ? industry.lastLayoffDate
          : industry.lastEmployDate
      ).getTime();
      const since = now - last;
      const timeout = buttonType === "layoff" ? layoffTimeout : employTimeout;
      return xs.of(buttonType).compose(sources.Time.delay(timeout - since));
    })
    .compose(flattenConcurrently)
    .map(buttonType => state =>
      set(state, [buttonType, "attrs", "disabled"], false)
    );

  return xs.merge(buttonInitializer$, buttonUpdater$);
};

function intent(sources, industryName) {
  const click$ = xs.merge(
    sources.DOM.select(`.industry .${industryName} .employ`)
      .events("click")
      .mapTo({ type: "INDUSTRY#EMPLOY", payload: { industryName } }),

    sources.DOM.select(`.industry .${industryName} .layoff`)
      .events("click")
      .mapTo({ type: "INDUSTRY#LAYOFF", payload: { industryName } }),

    sources.DOM.select(
      `.industry .${industryName} .effects-derivative-stats-button`
    )
      .events("click")
      .mapTo({
        type: "INDUSTRY#EFFECTS_DERIVATIVE_STATS",
        payload: { industryName }
      }),

    sources.DOM.select(
      `.industry .${industryName} .breakdown-derivative-stats-button`
    )
      .events("click")
      .mapTo({
        type: "INDUSTRY#BREAKDOWN_DERIVATIVE_STATS",
        payload: { industryName }
      })
  );
  return { click$ };
}

const reducers = action$ => {
  const clickReducer$ = action$
    .filter(action => /^INDUSTRY/.test(action.type))
    .map(action => state => {
      const buttonAction = action.type.replace(/INDUSTRY#/, "");
      const {
        payload: { industryName }
      } = action;
      switch (buttonAction) {
        case "BREAKDOWN_DERIVATIVE_STATS": // pass
        case "EFFECTS_DERIVATIVE_STATS": {
          const buttonType = buttonAction.includes("BREAKDOWN")
            ? "breakdown"
            : "effects";
          return update(state, ["derivatives", "shown"], shown =>
            shown === buttonType ? "" : buttonType
          );
        }
        case "LAYOFF": // pass
        case "EMPLOY":
          const buttonType = buttonAction.toLowerCase();
          return set(state, [buttonType, "attrs", "disabled"], true);
        default:
          new Error("not impl");
      }
    });

  return xs.merge(clickReducer$);
};

const initialSingleButtonState = {
  employ: { attrs: { disabled: true } },
  layoff: { attrs: { disabled: true } },
  derivatives: { shown: "" }
};

function Industry(sources, industryName) {
  const { click$ } = intent(sources, industryName);

  const buttonStateReducer$ = reducers(click$);

  const buttonStateUpdater$ = makeButtonStateUpdater(sources, industryName);

  const buttonState$ = xs
    .merge(buttonStateUpdater$, buttonStateReducer$)
    .fold((acc, reducer) => reducer(acc), initialSingleButtonState);

  const derivativeEffects$ = sources.props.derivative$.map(
    s => s.derivatives[industryName]
  );

  const derivativeBreakdown$ = sources.props.derivative$.map(s =>
    Object.entries(s.derivatives)
      .filter(
        ([, derivative]) => typeof derivative[industryName] !== "undefined"
      )
      .reduce(
        (derivativeBreakdown, [otherIndustryName, derivative]) => ({
          ...derivativeBreakdown,
          [otherIndustryName]: derivative[industryName]
        }),
        {}
      )
  );

  const vdom$ = xs
    .combine(
      sources.props.user,
      sources.props.industry,
      buttonState$,
      sources.props.derivative$,
      derivativeEffects$,
      derivativeBreakdown$
    )
    .map(
      ([
        { population },
        industry,
        {
          layoff: layoffAttrs,
          employ: employAttrs,
          derivatives: { shown: shownDerivative }
        },
        { derivativeSums },
        derivativeEffects,
        derivativeBreakdown
      ]) =>
        !tap(industryName, industry).unlocked
          ? null
          : div(`.${industryName}`, [
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
                      ? derivativeEffects
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
            ])
    );

  return {
    DOM: vdom$,
    click$
  };
}

export default function Industries(sources) {
  const derivative$ = sources.props.industries.map(industries => {
    const derivatives = INDUSTRY_KEYS.filter(
      industryName => industries[industryName].unlocked
    ).reduce(
      (acc, industryName) => ({
        ...acc,
        [industryName]: industrySupplyDerivative(industryName, industries)
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

  const industrySources = INDUSTRY_KEYS.map(industryName =>
    Industry(
      {
        ...sources,
        props: {
          user: sources.props.user,
          industry: sources.props.industries.map(
            industries => industries[industryName]
          ),
          derivative$
        }
      },
      industryName
    )
  );

  const industriesVDom$ = xs
    .combine(...industrySources.map(is => is.DOM))
    .map(vdoms => div(vdoms));

  const vdom$ = xs
    .combine(industriesVDom$)
    .map(([industryVDoms]) =>
      div(".industry", [h2(".industry-header", "Industry"), industryVDoms])
    );

  return {
    DOM: vdom$,
    action$: xs.merge(...industrySources.map(is => is.click$))
  };
}
