import xs from "xstream";
import dropRepeats from "xstream/extra/dropRepeats";
import throttle from "xstream/extra/throttle";
import { div, button, h4, span, sup } from "@cycle/dom";
import isolate from "@cycle/isolate";

import { partition, set, cases, updateAll } from "../util";
import { TIMEOUT, UPGRADES, GAME_UPDATE_UNLOCK_CONDITION } from "./constant";
import { tabButtons } from "./shared";

import "./upgrade.css";
import { toHumanTime } from "./format";

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

const timeLeft = (upgradeId, { resources, updateRates }) => {
  const cost = UPGRADES[upgradeId].cost.resources;
  return Object.entries(cost).reduce((mostTimeLeft, [resourceName, cost]) => {
    const timeLeft =
      (TIMEOUT / 1e3) *
      (Math.max(0, cost - resources[resourceName]) /
        updateRates.resources[resourceName]);
    return Math.max(timeLeft, mostTimeLeft);
  }, -Infinity);
};

function Upgrade(sources) {
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

  const costView = id => {
    const cost = UPGRADES[id].cost.resources;
    return div(
      ".upgrade-cost",
      Object.entries(cost)
        .map(([resource, cost]) => `${resource}: ${cost}`)
        .map(text => div(text))
    );
  };

  const timeRemainingView = (upgradeId, { resources, updateRates }) => {
    const remaining = timeLeft(upgradeId, { resources, updateRates });
    if (!remaining) return null;
    return span(
      ".upgrade-time-remaining",
      ["(", "~", toHumanTime(remaining), ")"].join("")
    );
  };

  const upgradeDom$ = xs
    .combine(
      sources.state.stream.compose(throttle(200)),
      upgrades$.compose(
        dropRepeats(({ upgrades: u1 }, { upgrades: u2 }) => u1 === u2)
      )
    )
    .map(([state, { upgrades, lockedUpgrades }]) => {
      const { resources, updateRates } = state;
      return div(
        ".upgrade-grid",
        lockedUpgrades
          .filter(([upgradeId]) => meetsUpgrades(upgrades, upgradeId))
          .map(([upgradeId]) =>
            div(".upgrade-grid-item", [
              div(".upgrade-grid-item-stats", [
                h4(
                  ".upgrade-grid-item-header",
                  UPGRADES[upgradeId].label || upgradeId
                ),
                costView(upgradeId)
              ]),
              div(".upgrade-purchase-container", [
                button(
                  ".upgrade-purchase",
                  {
                    dataset: { upgradeId },
                    attrs: { disabled: !meetsCost(resources, upgradeId) }
                  },
                  [
                    "Purchase ",
                    timeRemainingView(upgradeId, { resources, updateRates })
                  ]
                )
              ])
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
    { id: "purchasable", label: "new" },
    { id: "already-purchased", label: "purchased" }
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
    sources.DOM.select(".upgrade-purchase")
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
