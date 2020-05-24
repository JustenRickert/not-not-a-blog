import { assert } from "../util";

export const INDUSTRIES = {
  agriculture: {
    label: "Agriculture",
    productionRate: 5,
    costRate: 25,
    from: [{ points: 3 }]
  },
  archery: {
    label: "Archery",
    productionRate: 1,
    costRate: 500,
    from: [
      {
        industry: {
          handTool: { supply: 1 },
          wood: { supply: 20 },
          string: { supply: 10 }
        }
      }
    ]
  },
  handTool: {
    label: "Hand tool",
    productionRate: 0.5,
    costRate: 1e3,
    from: [
      { points: 100, industry: { stone: { supply: 50 }, wood: { supply: 75 } } }
    ]
  },
  hunting: {
    label: "Hunting",
    productionRate: 2,
    costRate: 250,
    from: [
      { points: 10 },
      { points: 2, industry: { handTool: { supply: 3 } } },
      { points: 1, industry: { archery: { supply: 1 } } }
    ]
  },
  metal: {
    label: "Metal",
    from: [
      {
        points: 250,
        industry: { stone: { supply: 100 }, wood: { supply: 50 } }
      }
    ],
    productionRate: 2,
    costRate: 200
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
    costRate: 200,
    from: [{ points: 300, industry: { wood: { supply: 30 } } }]
  },
  wood: {
    label: "Wood",
    productionRate: 2,
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
