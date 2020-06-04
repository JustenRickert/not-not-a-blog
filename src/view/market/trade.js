import xs from "xstream";
import sampleCombine from "xstream/extra/sampleCombine";
import delay from "xstream/extra/delay";
import { button, div, h3, span } from "@cycle/dom";

import { allKeyPaths, get, set, setAll } from "../../../util";
import { INDUSTRIES } from "../../constant";
import { decimal, percentage } from "../../format";

const kpToWord = kp => {
  switch (kp) {
    case "points":
      return "Points";
    default:
      return INDUSTRIES[kp.split(".")[1]].label;
  }
};

function renderColoredPercentage(n) {
  const color = n > 0 ? "tomato" : n < 0 ? "forestgreen" : undefined;
  return span({ style: { color } }, [n > 0 ? "+" : null, percentage(n)]);
}

function renderTradeLabel(state) {
  const { label } = INDUSTRIES[state.key];
  const { required } = state.derivedInvestment;
  return div(".stat", [
    h3(label),
    div(".info", [
      div(["Var. ", renderColoredPercentage(state.offset)]),
      div(["Supply +", decimal(required)]),
      div("Stock +1")
    ])
  ]);
}

function renderCostTable(state) {
  const {
    isDismissing,
    isInvesting,
    isShrinking,
    derivedInvestment: { disabled, scaledCosts, costPercentages }
  } = state;
  const isAnimating = Boolean(isDismissing || isInvesting || isShrinking);
  return div(".cost", [
    div(
      ".table",
      allKeyPaths(costPercentages).map(kp => {
        const costPercentage = get(costPercentages, kp);
        return div(".table-row", [
          div(".table-item", kpToWord(kp)),
          div(".table-item.number", [
            decimal(get(scaledCosts, kp)),
            ...(costPercentage < 1
              ? ["(", percentage(costPercentage), ")"]
              : [])
          ])
        ]);
      })
    ),
    div(".options", [
      button(".dismiss", { attrs: { disabled: isAnimating } }, "dismiss"),
      button(
        ".invest",
        { attrs: { disabled: disabled || isAnimating } },
        "invest"
      )
    ])
  ]);
}

export default function Trade(sources) {
  const dom$ = sources.state.stream.map(state => {
    const { isDismissing, isInvesting, isShrinking } = state;
    return div(
      [
        ".trade",
        isDismissing ? ".dismissing" : "",
        isInvesting ? ".investing" : "",
        isShrinking ? ".shrinking" : ""
      ]
        .filter(Boolean)
        .join(" "),
      {
        key: state.id,
        style: {
          animationDirection:
            (isDismissing || isInvesting) && Math.random() < 0.5
              ? "reverse"
              : undefined
        }
      },
      [renderTradeLabel(state), renderCostTable(state)]
    );
  });

  const dismiss$ = sources.dom.select("button.dismiss").events("click");
  const invest$ = sources.dom.select("button.invest").events("click");

  const shrinking$ = xs
    .merge(dismiss$, invest$)
    .compose(delay(225))
    .mapTo(state =>
      setAll(state, [
        ["isShrinking", true],
        ["isDismissing", false],
        ["isInvesting", false]
      ])
    );

  return {
    dom: dom$,
    state: xs.merge(
      dismiss$.mapTo(state => set(state, "isDismissing", true)),
      invest$.mapTo(state => set(state, "isInvesting", true)),
      shrinking$
    ),
    action: xs
      .merge(dismiss$.mapTo("dismiss"), invest$.mapTo("invest"))
      .compose(sampleCombine(sources.state.stream))
      .map(([type, trade]) => ({ type, trade }))
      .compose(delay(400))
  };
}
