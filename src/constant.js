export const UPGRADES = {
  advancedHandTools: {
    label: "Advanced hand tools",
    cost: {
      resources: { wood: 50, metals: 200, science: 200, art: 50 },
      upgrades: ["handTools", "coal", "furnace", "string"]
    },
    multiplier: {
      art: 1.01,
      metals: 1.02,
      science: 1.03,
      stones: 1.01,
      wood: 1.02
    }
  },
  animalHusbandry: {
    label: "Animal husbandry",
    cost: {
      resources: { wood: 100, metals: 100, science: 100 },
      upgrades: ["handTools"]
    }
  },
  blackPowder: {
    label: "Black Powder (Gun Powder)",
    cost: {
      resources: { metals: 150, wood: 100, science: 100 },
      upgrades: ["coal", "sulfur"]
    }
  },
  coal: {
    label: "Coal",
    cost: {
      resources: { wood: 100 },
      upgrades: ["furnace"]
    },
    multiplier: { resources: { metals: 1.02 } }
  },
  cooking: {
    label: "Cooking",
    cost: { resources: { wood: 50, stones: 50 }, upgrades: ["handTools"] },
    multiplier: { resources: { art: 1.01 } }
  },
  equine: {
    label: "Equestrianism",
    cost: {
      resources: { metals: 200, science: 300 },
      upgrades: ["animalHusbandry", "advancedHandTools"]
    }
  },
  fireworks: {
    label: "Fireworks",
    cost: {
      resources: { stones: 500, wood: 500, science: 1000, art: 1000 },
      upgrades: ["blackPowder"]
    }
  },
  furnace: {
    label: "Furnace",
    cost: { resources: { stones: 750, wood: 250 }, upgrades: ["handTools"] }
  },
  guns: {
    label: "Guns",
    cost: {
      resources: { metals: 1000, science: 1000 },
      upgrades: ["blackPowder", "advancedHandTools", "steel"]
    }
  },
  handTools: {
    label: "Hand tools",
    cost: { resources: { stones: 10 } },
    multiplier: { resources: { stones: 1.01 } }
  },
  measuringEquipment: {
    label: "Precise measuring",
    cost: {
      resources: { metals: 500, wood: 500, science: 500 },
      upgrades: ["advancedHandTools"]
    },
    multiplier: { resources: { science: 1.01 } }
  },
  paint: {
    label: "Paint",
    cost: {
      resources: { science: 100, art: 100 },
      upgrades: ["measuringEquipment"]
    },
    multiplier: { resources: { art: 1.05 } }
  },
  pastoralism: {
    label: "Pastoralism",
    cost: {
      resources: { wood: 200, metals: 100, science: 150 },
      upgrades: ["animalHusbandry"]
    }
  },
  steel: {
    label: "Steel",
    cost: {
      resources: { wood: 10e3, metals: 15e3 },
      upgrades: ["coal", "measuringEquipment"]
    },
    multiplier: { resources: { science: 1.01 } }
  },
  string: {
    label: "String",
    cost: { resources: { stones: 50, wood: 50 }, upgrades: ["handTools"] }
  },
  sulfur: {
    label: "Sulfur",
    cost: { resources: { stones: 1e3 }, upgrades: ["handTools"] }
  }
};
