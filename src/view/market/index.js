import "./market.css";

import xs from "xstream";
import debounce from "xstream/extra/debounce";
import { div, h2, section } from "@cycle/dom";
import isolate from "@cycle/isolate";
import { makeCollection } from "@cycle/state";

import {
  allKeyPaths,
  get,
  updateAll,
  omit,
  setAll,
  update
} from "../../../util";
import { marketInvestmentRequirement } from "./util";
import Trade from "./trade";

const investmentScaleCost = (state, market) => {
  const required = marketInvestmentRequirement(state, market);
  const kps = allKeyPaths(market.cost);
  const scaledCosts = updateAll(
    market.cost,
    kps.map(kp => [kp, s => (1 + market.offset) * required * s])
  );
  return {
    disabled: kps.some(kp => {
      const individualSupplyCost = (1 + market.offset) * get(market.cost, kp);
      const totalSupplyCost = individualSupplyCost * required;
      const currentSupply = get(state, kp);
      return currentSupply < totalSupplyCost;
    }),
    required,
    scaledCosts,
    costPercentages: setAll(
      {},
      kps.map(kp => [kp, get(state, kp) / get(scaledCosts, kp)])
    )
  };
};

const tradeCollectionScope = {
  state: {
    get: state =>
      state.market.map((trade, index) => ({
        derivedInvestment: investmentScaleCost(state, trade, index),
        isDismissing: false,
        isInvesting: false,
        ...trade
      })),
    set: (state, market) => ({
      ...state,
      market: market.map(trade => omit(trade, ["derivedInvestment"]))
    })
  }
};

const TradeCollection = isolate(
  makeCollection({
    item: Trade,
    itemKey: s => s.id,
    itemScope: id => id,
    collectSinks: instances => ({
      dom: instances
        .pickCombine("dom")
        .map(trades =>
          section(!trades.length ? "No stocks currently selling" : trades)
        ),
      action: instances.pickMerge("action"),
      state: instances.pickMerge("state")
    })
  }),
  tradeCollectionScope
);

export default function Market(sources) {
  const tradeCollectionSinks = TradeCollection(sources);

  const dom$ = tradeCollectionSinks.dom.map(trades =>
    div(".market", [h2("Market"), trades])
  );

  const reducer$ = xs.merge(
    tradeCollectionSinks.state,
    tradeCollectionSinks.action
      .filter(a => a.type === "dismiss")
      .map(a => state =>
        update(state, "market", ms =>
          ms.filter(trade => trade.id !== a.trade.id)
        )
      ),
    tradeCollectionSinks.action
      .filter(a => a.type === "invest")
      .map(a => state => {
        const {
          derivedInvestment: { scaledCosts, required },
          key,
          id
        } = a.trade;
        return updateAll(state, [
          ...allKeyPaths(scaledCosts).map(kp => [
            kp,
            s => s - get(scaledCosts, kp)
          ]),
          [["industry", key, "supply"], s => s + required],
          [["industry", key, "stock"], s => s + 1],
          ["market", ms => ms.filter(trade => trade.id !== id)]
        ]);
      })
  );

  return {
    dom: dom$,
    state: reducer$
  };
}
