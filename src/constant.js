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
      state.industry.handTool.stock >= 3 &&
      state.industry.string.stock >= 5
  }
};

export const INDUSTRIES = {
  agriculture: {
    label: "Agriculture",
    productionRate: 5,
    costRate: 5,
    from: [
      { points: 750 },
      {
        points: 25,
        industry: { handTool: { supply: 10 } }
      }
    ]
  },
  archery: {
    label: "Archery",
    productionRate: 1,
    costRate: 10,
    from: [
      {
        industry: {
          handTool: { supply: 1 },
          wood: { supply: 25 },
          string: { supply: 15 }
        }
      }
    ]
  },
  gun: {
    label: "Gun",
    productionRate: 1,
    costRate: 10,
    from: [
      {
        industry: {
          metal: { supply: 100 },
          handTool: { supply: 250 }
        }
      }
    ]
  },
  handTool: {
    label: "Hand tool",
    productionRate: 1,
    costRate: 5,
    from: [
      {
        industry: { stone: { supply: 300 }, wood: { supply: 250 } }
      }
    ],
    productionMultiplier: {
      points: 1.1,
      industry: {
        stone: { supply: 1.1 },
        wood: { supply: 1.1 }
      }
    }
  },
  hunting: {
    label: "Hunting",
    productionRate: 2,
    costRate: 250,
    from: [
      { points: 50, industry: { stone: { supply: 600 } } },
      { points: 25, industry: { wood: { supply: 400 } } },
      { points: 10, industry: { handTool: { supply: 25 } } },
      { points: 5, industry: { archery: { supply: 20 } } }
    ]
  },
  metal: {
    label: "Metal",
    from: [
      {
        points: 25,
        industry: { stone: { supply: 100 }, wood: { supply: 75 } }
      }
    ],
    productionRate: 2,
    costRate: 12,
    productionMultiplier: {
      points: 1.075
    }
  },
  stone: {
    label: "Stone",
    productionRate: 7,
    costRate: 100,
    from: [{ points: 1 }]
  },
  string: {
    label: "String",
    productionRate: 3,
    costRate: 20,
    from: [{ points: 25, industry: { wood: { supply: 30 } } }]
  },
  wood: {
    label: "Wood",
    productionRate: 5,
    costRate: 100,
    from: [{ points: 1 }]
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
