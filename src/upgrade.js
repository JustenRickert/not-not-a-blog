import xs from "xstream";
import dropRepeats from "xstream/extra/dropRepeats";
import { div, button } from "@cycle/dom";
import isolate from "@cycle/isolate";

import { partition, set, cases, updateAll } from "../util";
import { UPGRADES } from "./constant";
import { tabButton, tabButtons } from "./shared";

import "./upgrade.css";

const costView = id => {
  const cost = UPGRADES[id].cost.resources;
  return div(
    Object.entries(cost)
      .map(([resource, cost]) => `${resource}: ${cost}`)
      .map(text => div(text))
  );
};

const hasMaterials = (resources, upgradeId) => {
  const cost = UPGRADES[upgradeId].cost.resources;
  return Object.keys(cost).every(resourceId => resources[resourceId]);
};

const meetsCost = (resources, upgradeId) => {
  const cost = UPGRADES[upgradeId].cost.resources;
  return Object.entries(cost).every(
    ([resourceId, cost]) => resources[resourceId] >= cost
  );
};

const meetsUpgrades = (upgrades, upgradeId) => {
  const requirements = UPGRADES[upgradeId].cost.upgrades;
  if (!requirements) return true;
  return requirements.every(upgradeId => upgrades[upgradeId].unlocked);
};

function Upgrade(sources) {
  const resources$ = sources.state.stream.map(state => state.resources);

  const upgrades$ = sources.state.stream
    .map(state => state.upgrades)
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

  const unlockedUpgradesDom$ = upgrades$.map(({ unlockedUpgrades }) =>
    div(
      unlockedUpgrades.map(([upgradeId]) =>
        div([UPGRADES[upgradeId].label || upgradeId])
      )
    )
  );

  const upgradeDom$ = xs
    .combine(
      resources$,
      upgrades$.compose(
        dropRepeats(({ upgrades: u1 }, { upgrades: u2 }) => u1 === u2)
      )
    )
    .map(([resources, { upgrades, lockedUpgrades }]) => {
      return div(
        lockedUpgrades
          .filter(
            ([upgradeId]) =>
              hasMaterials(resources, upgradeId) &&
              meetsUpgrades(upgrades, upgradeId)
          )
          .map(([upgradeId]) =>
            div([
              UPGRADES[upgradeId].label || upgradeId,
              costView(upgradeId),
              button(
                ".purchase-upgrade",
                {
                  dataset: { upgradeId },
                  attrs: { disabled: !meetsCost(resources, upgradeId) }
                },
                "Purchase"
              )
            ])
          )
      );
    });

  const switchView$ = sources.state.stream
    .map(state => state.currentUpgradeTab)
    .map(
      cases(
        ["purchasable", upgradeDom$],
        ["already-purchased", unlockedUpgradesDom$]
      )
    )
    .flatten();

  const switchTabs = tabButtons([
    {
      id: "purchasable",
      label: "new"
    },
    {
      id: "already-purchased",
      label: "purchased"
    }
  ]);

  const tabs$ = sources.state.stream
    .map(state => state.currentUpgradeTab)
    .map(switchTabs)
    .map(tabs => div(".tabs.table-of-contents", tabs));

  const dom$ = xs
    .combine(tabs$, switchView$)
    .map(([tabs, view]) => div(".upgrade-view", [tabs, view]));

  const reducer$ = xs.merge(
    sources.DOM.select(".tabs.table-of-contents button")
      .events("click")
      .map(
        ({
          currentTarget: {
            dataset: { id }
          }
        }) => id
      )
      .debug()
      .map(tabId => state => set(state, "currentUpgradeTab", tabId)),
    sources.DOM.select(".purchase-upgrade")
      .events("click")
      .map(({ currentTarget: { dataset: { upgradeId } } }) => ({
        upgradeId,
        cost: UPGRADES[upgradeId].cost.resources
      }))
      .map(({ upgradeId, cost }) => state =>
        updateAll(state, [
          ...Object.entries(cost).map(([resourceName, cost]) => [
            ["resources", resourceName],
            supply => supply - cost
          ]),
          [["upgrades", upgradeId, "unlocked"], () => true],
          [["upgrades", upgradeId, "unlockDate"], () => new Date()]
        ])
      )
  );

  return {
    DOM: dom$,
    state: reducer$
  };
}

export default isolate(Upgrade, { state: null });
