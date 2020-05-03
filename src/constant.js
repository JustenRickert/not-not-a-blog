export const TIMEOUTS = {
  saveData: 30e3,
  points: 1e3,
  population: 10e3,
  food: 3e3,
  unlockIndustries: 120e3,
  derivativeThrottle: 15e3,
  industries: {
    agriculture: {
      supply: 4e3
    },
    foodService: {
      agricultureToFood: 7e3
    }
  }
};

export const makeInfoStub = () => ({
  createdDate: Date.now(),
  lastSaveDate: Date.now()
});

export const LEAST_POPULATION = 100;

export const makeUserStub = () => ({
  population: LEAST_POPULATION,
  points: 0,
  food: 100
  // TODO: implement timber industry and then housing ...
  // housing: 0
});

const INDUSTRY_STUB = {
  unlocked: false,
  employed: 0
};

export const makeIndustriesStub = () => ({
  agriculture: { ...INDUSTRY_STUB, supply: 0, unlocked: true },
  foodService: INDUSTRY_STUB
});

export const INDUSTRIES_UNLOCK_CONDITIONS = {
  foodService: state => state.industries.agriculture.supply > 100
};

export const FOOD_PER_PERSON = 0.01;

export const POPULATION_CAPACITY_PER_POINT = 1 / 100;

export const POPULATION_GROWTH_RATE = 0.02;

export const EMPLOYMENT = {
  layoffRate: 0.02,
  employRate: 0.02
};

export const INDUSTRIES_UPDATE_SUPPLY_RATE = {
  agriculture: 0.5,
  foodService: {
    unit: 0.9,
    agriculture: -1
  }
};
