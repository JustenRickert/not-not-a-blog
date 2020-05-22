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

// TODO: rename this to `INDUSTRIES`?
export const UPGRADES = {
  advancedHandTools: {
    label: "Advanced hand tools",
    cost: {
      resources: { wood: 50, metals: 200, science: 200, art: 50 },
      upgrades: ["handTools", "coal", "furnace", "string"]
    },
    multiplier: {
      art: 1.1,
      metals: 1.2,
      science: 1.3,
      stones: 1.1,
      wood: 1.2
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
      upgrades: ["handTools", "furnace"]
    }
  },
  blackPowder: {
    label: "Black Powder (Gun Powder)",
    cost: {
      resources: { metals: 150, wood: 100, science: 100 },
      upgrades: ["coal", "sulfur"]
    }
  },
  brass: {
    label: "Brass",
    cost: {
      resources: { metals: 15e3, art: 10e3, science: 500 },
      upgrades: []
    }
  },
  bronze: {
    label: "Bronze",
    cost: {
      resources: { metals: 10e3 },
      upgrades: []
    }
  },
  baking: {
    label: "Baking",
    cost: {
      resources: { wood: 100, metals: 250e3, art: 250e3 },
      upgrades: ["measurement", "cooking"]
    },
    multiplier: { resources: { art: 1.1 } }
  },
  coal: {
    label: "Coal",
    cost: {
      resources: { wood: 100 },
      upgrades: ["furnace"]
    },
    multiplier: { resources: { metals: 1.02 } },
    enterprise: {
      coal: true
    }
  },
  copper: {
    label: "Copper",
    cost: {
      resources: { metals: 10e3 }
    }
  },
  cooking: {
    label: "Cooking",
    cost: { resources: { wood: 15, stones: 10 }, upgrades: ["handTools"] },
    multiplier: { resources: { art: 1.1, science: 1.1 } }
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
    multiplier: { resources: { stones: 1.1, wood: 1.1 } }
  },
  irrigation: {
    label: "Irrigation",
    cost: {
      resources: { wood: 1000, metals: 750, science: 1200 },
      upgrades: ["handTools", "farming"]
    }
  },
  measurement: {
    label: "Measurement",
    cost: {
      resources: { metals: 100e3, wood: 100e3, science: 100e3, art: 50e3 },
      upgrades: ["advancedHandTools"]
    },
    multiplier: { resources: { science: 1.1 } }
  },
  measuringEquipment: {
    label: "Precise measuring",
    cost: {
      resources: { metals: 500e3, wood: 500e3, science: 500e3, art: 250e3 },
      upgrades: ["measurement"]
    },
    multiplier: { resources: { science: 1.1 } }
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
  steamEngine: {
    label: "Steam Engine",
    cost: {
      resources: { metals: 20e3, wood: 10e3 },
      upgrades: ["steel"]
    },
    multiplier: { resources: { science: 1.1 } }
  },
  steel: {
    label: "Steel",
    cost: {
      resources: { wood: 10e3, metals: 15e3 },
      upgrades: ["coal", "measuringEquipment"]
    },
    multiplier: { resources: { science: 1.1 } }
  },
  string: {
    label: "String",
    cost: { resources: { stones: 50, wood: 50 }, upgrades: ["handTools"] }
  },
  sulfur: {
    label: "Sulfur",
    cost: { resources: { stones: 1e3 }, upgrades: ["handTools"] }
  },
  tin: {
    label: "Tin",
    cost: {
      resources: { metals: 10e3 }
    }
  }
};

export const INIT_STATE = {
  userInformation: null,
  population: 10,
  resources: {
    art: Number.EPSILON,
    coal: Number.EPSILON,
    metals: Number.EPSILON,
    science: Number.EPSILON,
    stones: Number.EPSILON,
    wood: Number.EPSILON
  },
  enterprise: {
    lastIndustriesUpdate: 0,
    currentIndustries: null, // should be non-null, derived information
    currentIndustryInvestments: {}
  },
  upgrades: Object.keys(UPGRADES).reduce(
    (upgrades, upgradeId) => ({
      ...upgrades,
      [upgradeId]: {
        unlocked: false,
        unlockDate: null
      }
    }),
    {}
  ),
  viewedChapters: ["introduction"],
  currentUpgradeTab: "purchasable",
  currentGamePanel: "stats",
  currentGameView: "user-information-entry",
  currentChapter: "introduction",
  currentPanel: "story"
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
