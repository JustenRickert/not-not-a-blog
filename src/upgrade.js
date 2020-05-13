import xs from "xstream";
import dropRepeats from "xstream/extra/dropRepeats";
import { set, cases, updateAll } from "../util";
import { div, h2, nav, section, button, sup } from "@cycle/dom";
import isolate from "@cycle/isolate";

import { partition } from "../util";

const UPGRADE_COST = {
  handTools: {
    resources: {
      stones: 10
    }
  },
  furnace: {
    resources: {
      stones: 50,
      wood: 50
    }
  }
};

const UPGRADE_LABEL = {
  handTools: "Hand tools",
  furnace: "Furnace"
};

const costView = id => {
  const cost = UPGRADE_COST[id].resources;
  return div(
    Object.entries(cost)
      .map(([resource, cost]) => `${resource}: ${cost}`)
      .map(text => div(text))
  );
};

const meetsCost = (resources, upgradeId) => {
  const cost = UPGRADE_COST[upgradeId].resources;
  return Object.entries(cost).every(
    ([resourceId, cost]) => resources[resourceId] >= cost
  );
};

function Upgrade(sources) {
  const resources$ = sources.state.stream.map(state => state.resources);

  const upgrades$ = sources.state.stream
    .map(state => state.upgrades)
    .compose(dropRepeats())
    .map(upgrades => {
      const [lockedUpgrades, unlockedUpgrades] = partition(
        Object.entries(upgrades),
        ([, { unlocked }]) => !unlocked
      );
      return {
        upgrades,
        lockedUpgrades,
        unlockedUpgrades
      };
    });

  const dom$ = xs
    .combine(resources$, upgrades$)
    .map(([resources, { lockedUpgrades }]) => {
      return div(
        lockedUpgrades.map(([id]) =>
          div([
            UPGRADE_LABEL[id],
            costView(id),
            button(
              ".purchase-upgrade",
              {
                dataset: { id },
                attrs: { disabled: !meetsCost(resources, id) }
              },
              "Purchase"
            )
          ])
        )
      );
    });

  const reducer$ = sources.DOM.select(".purchase-upgrade")
    .events("click")
    .map(({ currentTarget: { dataset: { id } } }) => ({
      id,
      cost: UPGRADE_COST[id].resources
    }))
    .map(({ id, cost }) => state =>
      updateAll(state, [
        ...Object.entries(cost).map(([resourceName, cost]) => [
          ["resources", resourceName],
          supply => supply - cost
        ]),
        [["upgrades", id, "unlocked"], () => true]
      ])
    );

  return {
    DOM: dom$,
    state: reducer$
  };
}

export default isolate(Upgrade, { state: null });
