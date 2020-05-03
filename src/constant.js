export const TIMEOUTS = {
  saveData: 30,
  points: 1,
  population: 10,
  food: 3,
  unlockIndustries: 7,
  derivativeThrottle: 4,
  industries: {
    agriculture: {
      supply: 2
    },
    foodService: {
      agricultureToFood: 3
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
