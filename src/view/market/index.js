import "./market.css";

import xs from "xstream";
import { button, div, h2, h3, section, span } from "@cycle/dom";
import isolate from "@cycle/isolate";

import { allKeyPaths, get, set, updateAll, omit, update } from "../../../util";
import { INDUSTRIES } from "../../constant";
import { decimal, percentage } from "../../format";
import { marketInvestmentRequirement } from "./util";

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

function renderTrade(state, trade, tradeIndex) {
  const { derivedMarketCosts } = state;
  const costs = derivedMarketCosts[tradeIndex];
  const { label } = INDUSTRIES[trade.key];
  const { disabled, requiredInvestment, scaledCosts } = costs;
  return div(".trade", [
    div(".stat", [
      h3(label),
      div(".info", [
        div(["Var. ", renderColoredPercentage(trade.offset)]),
        div(["Supply +", decimal(requiredInvestment)]),
        div("Stock +1")
      ])
    ]),
    div(".cost", [
      div(
        ".table",
        allKeyPaths(scaledCosts).map(kp => {
          const supplyCost = get(scaledCosts, kp);
          const currentSupply = get(state, kp);
          return div(".table-row", [
            div(".table-item", kpToWord(kp)),
            div(".table-item.number", [
              decimal(get(scaledCosts, kp)),
              ...(currentSupply < supplyCost
                ? ["(", percentage(currentSupply / supplyCost), ")"]
                : [])
            ])
          ]);
        })
      ),
      div(".options", [
        button(".dismiss", { dataset: { tradeIndex } }, "dismiss"),
        button(
          ".invest",
          { attrs: { disabled }, dataset: { tradeIndex } },
          "invest"
        )
      ])
    ])
  ]);
}

function Market(sources) {
  const dom$ = sources.state.stream.map(state => {
    const { market } = state;
    return div(".market", [
      h2("Market"),
      section(
        !market.length
          ? "No stocks currently selling"
          : market.map((trade, tradeIndex) =>
              renderTrade(state, trade, tradeIndex)
            )
      )
    ]);
  });

  const dismissAction$ = sources.dom
    .select(".trade .cost button.dismiss")
    .events("click")
    .map(e => e.ownerTarget.dataset)
    .map(({ tradeIndex = 0 }) => ({
      tradeIndex: Number(tradeIndex)
    }));

  const investAction$ = sources.dom
    .select(".trade .cost button.invest")
    .events("click")
    .map(e => e.ownerTarget.dataset)
    .map(({ tradeIndex = 0 }) => ({
      tradeIndex: Number(tradeIndex)
    }));

  const reducer$ = xs.merge(
    dismissAction$.map(({ tradeIndex }) => state =>
      update(state, "market", ms => ms.filter((_, i) => i !== tradeIndex))
    ),
    investAction$.map(({ tradeIndex }) => state => {
      const { market, derivedMarketCosts } = state;
      const { key } = market[tradeIndex];
      const { scaledCosts, requiredInvestment } = derivedMarketCosts[
        tradeIndex
      ];
      return updateAll(state, [
        ...allKeyPaths(scaledCosts).map(kp => [
          kp,
          s => s - get(scaledCosts, kp)
        ]),
        [["industry", key, "supply"], s => s + requiredInvestment],
        [["industry", key, "stock"], s => s + 1],
        ["market", ms => ms.filter((_, i) => i !== tradeIndex)]
      ]);
    })
  );

  return {
    dom: dom$,
    state: reducer$
  };
}

const investmentScaleCost = (state, market) => {
  const requiredInvestment = marketInvestmentRequirement(state, market);
  const kps = allKeyPaths(market.cost);
  return {
    disabled: kps.some(kp => {
      const individualSupplyCost = (1 + market.offset) * get(market.cost, kp);
      const totalSupplyCost = individualSupplyCost * requiredInvestment;
      const currentSupply = get(state, kp);
      return currentSupply < totalSupplyCost;
    }),
    requiredInvestment,
    scaledCosts: updateAll(
      market.cost,
      kps.map(kp => [kp, s => (1 + market.offset) * requiredInvestment * s])
    )
  };
};

export default isolate(Market, {
  state: {
    get: state =>
      set(
        state,
        "derivedMarketCosts",
        state.market.map((market, marketIndex) =>
          investmentScaleCost(state, market, marketIndex)
        )
      ),
    set: (_, state) => omit(state, "derived")
  },
  route: null
});
