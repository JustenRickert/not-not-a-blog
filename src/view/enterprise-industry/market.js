import { button, div, span, ul, li } from "@cycle/dom";
import isolate from "@cycle/isolate";

import { decimal, percentage } from "../../format";
import { allKeyPaths, get, set, updateAll, omit } from "../../../util";
import { INDUSTRIES } from "../../constant";

const INVESTMENT_GROWTH_PERCENTAGE = 0.25;

function renderMarket(state, market, marketIndex) {
  const {
    derived: { scaledInvestmentCosts }
  } = state;
  return div([
    INDUSTRIES[market.key].label,
    " ",
    decimal(state.industry[market.key].supply),
    ul(
      scaledInvestmentCosts[marketIndex].map(
        ({ costs, disabled }, investmentIndex) => {
          const kps = allKeyPaths(costs);
          return li(".market", [
            span(kps.map(kp => `${decimal(get(costs, kp))} ${kp}`).join(", ")),
            " ",
            span(percentage(market.offset)),
            button(
              {
                attrs: { disabled },
                dataset: { marketIndex, investmentIndex }
              },
              "invest!"
            )
          ]);
        }
      )
    )
  ]);
}

function Market(sources) {
  const dom$ = sources.state.stream.map(state => {
    const { markets } = state;
    return div(
      markets.map((market, marketIndex) =>
        renderMarket(state, market, marketIndex)
      )
    );
  });

  const investAction$ = sources.dom
    .select(".market button")
    .events("click")
    .map(e => e.ownerTarget.dataset)
    .map(({ marketIndex = 0, investmentIndex = 0 }) => ({
      marketIndex: Number(marketIndex),
      investmentIndex: investmentIndex
    }));

  const reducer$ = investAction$.map(
    ({ marketIndex, investmentIndex }) => state => {
      const {
        derived: { scaledInvestmentCosts }
      } = state;
      const { key, costs, amount } = scaledInvestmentCosts[marketIndex][
        investmentIndex
      ];
      const kps = allKeyPaths(costs);
      return updateAll(state, [
        ...kps.map(kp => [kp, s => s - get(costs, kp)]),
        [["industry", key, "supply"], s => s + amount],
        [["industry", key, "stock"], s => s + 1],
        [["markets"], markets => markets.filter((_, i) => i !== marketIndex)]
      ]);
    }
  );

  return {
    dom: dom$,
    state: reducer$
  };
}

const investmentScaleCost = (state, market, marketIndex) => {
  return market.costs.map(cost => {
    const kps = allKeyPaths(cost);
    const currentMarketSupply = get(state, ["industry", market.key, "supply"]);
    const requiredInvestment = Math.max(
      1,
      (1 + market.offset) * INVESTMENT_GROWTH_PERCENTAGE * currentMarketSupply
    );
    const disabled = kps.some(kp => {
      const individualSupplyCost = get(cost, kp);
      const totalSupplyCost = individualSupplyCost * requiredInvestment;
      const currentSupply = get(state, kp);
      return currentSupply < totalSupplyCost;
    });
    return {
      key: market.key,
      disabled,
      amount: requiredInvestment,
      marketIndex,
      costs: updateAll(cost, kps.map(kp => [kp, s => requiredInvestment * s]))
    };
  });
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
