import xs from "xstream";
import dropRepeats from "xstream/extra/dropRepeats";
import { div, h2, nav, section, button, sup } from "@cycle/dom";
import isolate from "@cycle/isolate";

import { partition, set, cases, updateAll } from "../util";

import "./upgrade.css";

const UPGRADE_COST = {
  advancedHandTools: {
    resources: { wood: 50, metals: 200, science: 200, art: 50 },
    upgrades: ["handTools", "coal", "furnace", "string"]
  },
  animalHusbandry: {
    resources: { wood: 100, metals: 100, science: 100 },
    upgrades: ["handTools"]
  },
  coal: { resources: { wood: 100 }, upgrades: ["furnace"] },
  cooking: { resources: { wood: 50, stones: 50 }, upgrades: ["handTools"] },
  equine: {
    resources: { metals: 200, science: 300 },
    upgrades: ["animalHusbandry", "advancedHandTools"]
  },
  furnace: { resources: { stones: 100, wood: 50 }, upgrades: ["handTools"] },
  handTools: { resources: { stones: 10 } },
  measuringEquipment: {
    resources: { metals: 500, wood: 500, science: 500 },
    upgrades: ["advancedHandTools"]
  },
  paint: {
    resources: { science: 100, art: 100 },
    upgrades: ["measuringEquipment"]
  },
  pastoralism: {
    resources: { wood: 200, metals: 100, science: 150 },
    upgrades: ["animalHusbandry"]
  },
  steel: {
    resources: { wood: 10e3, metals: 15e3 },
    upgrades: ["coal", "measuringEquipment"]
  },
  string: { resources: { stones: 50, wood: 50 }, upgrades: ["handTools"] }
};

const UPGRADE_LABEL = {
  advancedHandTools: "Advanced hand tools",
  animalHusbandry: "Animal husbandry",
  coal: "Coal",
  cooking: "Cooking",
  equine: "Equestrianism",
  furnace: "Furnace",
  handTools: "Hand tools",
  measuringEquipment: "Precise measuring",
  paint: "Painting",
  pastoralism: "Pastoralism",
  steel: "Steel",
  string: "String"
};

const costView = id => {
  const cost = UPGRADE_COST[id].resources;
  return div(
    Object.entries(cost)
      .map(([resource, cost]) => `${resource}: ${cost}`)
      .map(text => div(text))
  );
};

const hasMaterials = (resources, upgradeId) => {
  const cost = UPGRADE_COST[upgradeId].resources;
  return Object.keys(cost).every(resourceId => resources[resourceId]);
};

const meetsCost = (resources, upgradeId) => {
  const cost = UPGRADE_COST[upgradeId].resources;
  return Object.entries(cost).every(
    ([resourceId, cost]) => resources[resourceId] >= cost
  );
};

const meetsUpgrades = (upgrades, upgradeId) => {
  const requirements = UPGRADE_COST[upgradeId].upgrades;
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
        div([UPGRADE_LABEL[upgradeId] || upgradeId])
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
          .filter(([upgradeId]) => hasMaterials(resources, upgradeId))
          .map(([upgradeId]) =>
            div([
              UPGRADE_LABEL[upgradeId] || upgradeId,
              costView(upgradeId),
              button(
                ".purchase-upgrade",
                {
                  dataset: { upgradeId },
                  attrs: {
                    disabled: !(
                      meetsCost(resources, upgradeId) &&
                      meetsUpgrades(upgrades, upgradeId)
                    )
                  }
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

  const dom$ = switchView$.map(view =>
    div(".upgrade-view", [
      div(".tabs.table-of-contents", [
        button({ dataset: { tabId: "purchasable" } }, "new"),
        button({ dataset: { tabId: "already-purchased" } }, "purchased")
      ]),
      view
    ])
  );

  const reducer$ = xs.merge(
    sources.DOM.select(".tabs.table-of-contents button")
      .events("click")
      .map(
        ({
          currentTarget: {
            dataset: { tabId }
          }
        }) => tabId
      )
      .map(tabId => state => set(state, "currentUpgradeTab", tabId)),
    sources.DOM.select(".purchase-upgrade")
      .events("click")
      .map(({ currentTarget: { dataset: { upgradeId } } }) => ({
        upgradeId,
        cost: UPGRADE_COST[upgradeId].resources
      }))
      .map(({ upgradeId, cost }) => state =>
        updateAll(state, [
          ...Object.entries(cost).map(([resourceName, cost]) => [
            ["resources", resourceName],
            supply => supply - cost
          ]),
          [["upgrades", upgradeId, "unlocked"], () => true]
        ])
      )
  );

  return {
    DOM: dom$,
    state: reducer$
  };
}

export default isolate(Upgrade, { state: null });
