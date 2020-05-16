export const TIMEOUT = 5e3;

// TODO Probably before going too far into these TODOs, get the timings and
// writings figured out a little more carefully. Maybe make a cool tool to graph
// them :o

// TODO
// archaeology, paleontology, anthropology, botany, zoology, genetics,
// environmental sciences

// TODO
// mathematics, physics, chemistry, additional specific stuff like set theory
// and junk

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
  agriculture: {
    label: "Agriculture",
    cost: {
      resources: { wood: 2500, metals: 3000, science: 2500 },
      upgrades: ["pastoralism", "irrigation"]
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
  domestication: {
    label: "Domestication",
    cost: {
      resources: { art: 2000, science: 1500 },
      upgrades: ["pastoralism"]
    },
    multiplier: { art: 1.3 }
  },
  equine: {
    label: "Equestrianism",
    cost: {
      resources: { metals: 200, science: 300 },
      upgrades: ["animalHusbandry", "advancedHandTools"]
    }
  },
  fishing: {
    label: "Fishing",
    cost: {
      resources: { stones: 900, wood: 1500, science: 500, art: 500 },
      upgrades: ["advancedHandTools"]
    }
  },
  fireworks: {
    label: "Fireworks",
    cost: {
      resources: { stones: 500, wood: 500, science: 1000, art: 1000 },
      upgrades: ["blackPowder"]
    }
  },
  farming: {
    label: "Farming",
    cost: {
      resources: { stones: 1000, wood: 1250, science: 250 },
      upgrades: ["handTools"]
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
  irrigation: {
    label: "Irrigation",
    cost: {
      resources: { wood: 1000, metals: 750, science: 1200 },
      upgrades: ["handTools", "farming"]
    }
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
      resources: { wood: 2000, metals: 1000, science: 1500 },
      upgrades: ["animalHusbandry"]
    }
  },
  slashAndBurnAgriculture: {
    label: "Slash and Burn",
    cost: {
      resources: { wood: 10e3 },
      upgrades: ["agriculture"]
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

export const GAME_UPDATE_UNLOCK_CONDITION = {
  population: state => Boolean(state.userInformation),
  resources: {
    art: state => state.upgrades.string.unlocked,
    metals: state => state.upgrades.furnace.unlocked,
    science: state => state.upgrades.cooking.unlocked,
    stones: state => state.userInformation,
    wood: state => state.upgrades.handTools.unlocked
  }
};
