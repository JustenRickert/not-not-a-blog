import { button, div, h2, h3, section, span } from "@cycle/dom";
import isolate from "@cycle/isolate";

import { allKeyPaths, get, set, updateAll, omit } from "../../../util";
import { INDUSTRIES } from "../../constant";
import { decimal, percentage } from "../../format";
import { marketInvestmentRequirement } from "./util";

import "./market.css";

const kpToWord = kp => {
  switch (kp) {
    case "points":
      return kp;
    default:
      return kp.split(".")[1];
  }
};

function renderColoredPercentage(n) {
  const color = n > 0 ? "tomato" : n < 0 ? "forestgreen" : undefined;
  return span({ style: { color } }, [n > 0 ? "+" : null, percentage(n)]);
}

function renderMarketCostOption({
  scaledCost,
  disabled,
  marketIndex,
  investmentIndex
}) {
  return div(".cost-option", [
    div(
      ".table",
      allKeyPaths(scaledCost).map(kp =>
        div(".table-row", [
          div(".table-item", kpToWord(kp)),
          div(".table-item.number", decimal(get(scaledCost, kp)))
        ])
      )
    ),
    div(
      ".invest",
      button(
        {
          attrs: { disabled },
          dataset: { marketIndex, investmentIndex }
        },
        "invest!"
      )
    )
  ]);
}

function renderMarket(state, market, marketIndex) {
  const {
    derived: { scaledInvestmentCosts }
  } = state;
  const { label } = INDUSTRIES[market.key];
  const { costs, requiredInvestment } = scaledInvestmentCosts[marketIndex];
  return div(".market", [
    div(".stat", [
      h3(label),
      div([renderColoredPercentage(market.offset)]),
      div([decimal(requiredInvestment), "/stock"])
    ]),
    div(
      ".cost",
      costs.map(({ scaledCost, disabled }, investmentIndex) =>
        renderMarketCostOption({
          disabled,
          scaledCost,
          marketIndex,
          investmentIndex
        })
      )
    )
  ]);
}

function Market(sources) {
  const dom$ = sources.state.stream.map(state => {
    const { markets } = state;
    return div(".markets", [
      h2("Market"),
      section(
        !markets.length
          ? "No stock currently selling"
          : markets.map((market, marketIndex) =>
              renderMarket(state, market, marketIndex)
            )
      )
    ]);
  });

  const investAction$ = sources.dom
    .select(".market .cost button")
    .events("click")
    .map(e => e.ownerTarget.dataset)
    .map(({ marketIndex = 0, investmentIndex = 0 }) => ({
      marketIndex: Number(marketIndex),
      investmentIndex: Number(investmentIndex)
    }));

  const reducer$ = investAction$.map(
    ({ marketIndex, investmentIndex }) => state => {
      const {
        derived: { scaledInvestmentCosts }
      } = state;
      const { key, costs, requiredInvestment } = scaledInvestmentCosts[
        marketIndex
      ];
      const { scaledCost } = costs[investmentIndex];
      const kps = allKeyPaths(scaledCost);
      return updateAll(state, [
        ...kps.map(kp => [kp, s => s - get(scaledCost, kp)]),
        [["industry", key, "supply"], s => s + requiredInvestment],
        [["industry", key, "stock"], s => s + 1],
        [
          ["markets", marketIndex, "costs"],
          costs => costs.filter((_, i) => i !== investmentIndex)
        ],
        [["markets"], markets => markets.filter(m => m.costs.length)]
      ]);
    }
  );

  return {
    dom: dom$,
    state: reducer$
  };
}

const investmentScaleCost = (state, market) => {
  const requiredInvestment = marketInvestmentRequirement(state, market);
  const costs = market.costs.map(cost => {
    const kps = allKeyPaths(cost);
    const disabled = kps.some(kp => {
      const individualSupplyCost = get(cost, kp);
      const totalSupplyCost = individualSupplyCost * requiredInvestment;
      const currentSupply = get(state, kp);
      return currentSupply < totalSupplyCost;
    });
    return {
      disabled,
      scaledCost: updateAll(
        cost,
        kps.map(kp => [kp, s => requiredInvestment * s])
      )
    };
  });
  return {
    key: market.key,
    requiredInvestment,
    costs
  };
};

export default isolate(Market, {
  state: {
    get: state =>
      set(
        state,
        "derived.scaledInvestmentCosts",
        state.markets.map((market, marketIndex) =>
          investmentScaleCost(state, market, marketIndex)
        )
      ),
    set: (_, state) => omit(state, "derived")
  },
  route: null
});
