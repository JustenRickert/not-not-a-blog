import { assert } from "../util";

export const STORY = {
  newAlienHero: {
    route: "new-alien-hero",
    // TODO maybe rename to `eventCondition`? It's _not_ the condition to view
    // the chapter, rather it's the condition to get the event that then allows
    // the chapter to be unlocked
    condition: state =>
      state.userInformation &&
      !state.userInformation.newAlienHero &&
      Boolean(state.industry.handTool.stock) &&
      state.industry.string.stock >= 5
  }
};

export const INDUSTRIES = {
  agriculture: {
    label: "Agriculture",
    productionRate: 5,
    costRate: 5,
    from: [
      { points: 1e3 },
      {
        industry: { handTool: { supply: 100 } }
      }
    ],
    productionMultiplier: {
      points: 1.01
    }
  },
  arms: {
    label: "Arms",
    productionRate: 1,
    costRate: 10,
    from: [
      {
        industry: {
          handTool: { supply: 1e3 },
          wood: { supply: 25e3 },
          string: { supply: 25e3 }
        }
      },
      {
        industry: {
          stone: { supply: 100e3 },
          metal: { supply: 25e3 },
          handTool: { supply: 1e3 }
        }
      }
    ]
  },
  coal: {
    label: "Coal",
    productionRate: 1,
    costRate: 10,
    from: [
      {
        industry: {
          wood: { supply: 50e3 },
          metal: { supply: 1.5e3 }
        }
      }
    ]
  },
  electricity: {
    label: "Electricity",
    productionRate: 1,
    costRate: 10,
    from: [
      {
        industry: {
          coal: { supply: 10e3 },
          metal: { supply: 7e3 }
        }
      }
    ]
  },
  fishing: {
    label: "Fishing",
    productionRate: 1,
    costRate: 10,
    from: [
      {
        industry: {
          agriculture: { supply: 5e3 },
          string: { supply: 5e3 }
        }
      }
    ]
  },
  handTool: {
    label: "Hand tool",
    productionRate: 1,
    costRate: 8,
    from: [
      {
        industry: {
          stone: { supply: 500 },
          wood: { supply: 500 }
        }
      }
    ]
  },
  hunting: {
    label: "Hunting",
    productionRate: 2,
    costRate: 10,
    from: [
      {
        industry: { wood: { supply: 1e3 }, stone: { supply: 1e3 } }
      },
      { industry: { handTool: { supply: 25 } } },
      { points: 5, industry: { arms: { supply: 20 } } }
    ],
    productionMultiplier: {
      points: 1.01
    }
  },
  metal: {
    label: "Metal",
    productionRate: 2,
    costRate: 2.5,
    from: [
      {
        industry: {
          handTool: { supply: 100 },
          stone: { supply: 10e3 },
          wood: { supply: 7.5e3 }
        }
      }
    ]
  },
  paper: {
    label: "Paper",
    productionRate: 1,
    costRate: 10,
    from: [
      {
        industry: {
          handTool: { supply: 20e3 },
          metal: { supply: 20e3 },
          stone: { supply: 50e3 },
          string: { supply: 15e3 },
          wood: { supply: 50e3 }
        }
      }
    ]
  },
  stone: {
    label: "Stone",
    productionRate: 1,
    costRate: 10,
    from: [
      {
        points: 1
      }
    ],
    productionMultiplier: {
      industry: {
        handTool: 1.01
      }
    }
  },
  string: {
    label: "String",
    productionRate: 1,
    costRate: 10,
    from: [
      {
        points: 100,
        industry: { wood: { supply: 25 }, handTool: { supply: 5 } }
      }
    ],
    productionMultiplier: {
      points: 1.01
    }
  },
  transportation: {
    label: "Transportation",
    productionRate: 1,
    costRate: 10,
    from: [
      {
        industry: {
          metal: { supply: 2e3 },
          coal: { supply: 3e3 }
        }
      }
    ]
  },
  wood: {
    label: "Wood",
    productionRate: 1,
    costRate: 10,
    from: [
      {
        points: 1
      }
    ],
    productionMultiplier: {
      industry: {
        metal: 1.02
      }
    }
  }
};

Object.entries(INDUSTRIES).forEach(([key, industry]) => {
  ["label", "productionRate", "costRate", "from"].forEach(attrKey => {
    assert(attrKey in industry, `${attrKey} required`, {
      key,
      industry,
      attrKey
    });
  });
});
