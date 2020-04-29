export const INITIAL_POPULATION = 1000;

const INDUSTRY_STUB = {
  allocation: 0,
  supply: 0
};

export const INDUSTRY_LABELS = {
  agriculture: "Farming and junk",
  baking: "Cooking and stuff",
  forestry: "Nurturing trees and things",
  handTool: "Making shit (hand tools)",
  mining: "Getting things out of the ground (mining)",
  textiles: "Wearing clothes"
};

export const INDUSTRIES_STUB = {
  agriculture: INDUSTRY_STUB,
  baking: INDUSTRY_STUB,
  forestry: INDUSTRY_STUB,
  handTool: INDUSTRY_STUB,
  mining: INDUSTRY_STUB,
  textiles: INDUSTRY_STUB
};

export const INDUSTRY_KEYS = Object.keys(INDUSTRIES_STUB);

export const INDUSTRY_SUPPLY_TIMEOUTS = {
  agriculture: 1e3,
  baking: 1.5e3,
  forestry: 1.25e3,
  handTool: 2e3,
  mining: 2.75e3,
  textiles: 3.1e3
};

export const INDUSTRIES_UPDATE_SUPPLY_RATE = {
  agriculture: 0.05,
  baking: {
    unit: 0.02,
    agriculture: 3
  },
  forestry: {
    unit: 0.1,
    agriculture: 1,
    mining: 1,
    handTool: 1
  },
  handTool: {
    unit: 0.05,
    agriculture: 0.1,
    mining: 5
  },
  mining: 0.01,
  textiles: {
    unit: 0.01,
    agriculture: 0.5,
    handTool: 1
  }
};
