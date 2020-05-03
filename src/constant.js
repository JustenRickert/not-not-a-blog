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
      agricultureToFood: 2
    },
    timber: {
      supply: 3.5
    }
  }
};

export const makeInfoStub = () => ({
  createdDate: Date.now(),
  lastSaveDate: Date.now()
});

export const LEAST_POPULATION = 100;
export const LEAST_UPPER_CAPACITY = 1000;

export const makeUserStub = () => ({
  population: LEAST_POPULATION,
  points: 0,
  food: 100,
  // TODO: implement timber industry and then housing ...
  housing: 0
});

const INDUSTRY_STUB = {
  unlocked: false,
  employed: 0
};

export const makeIndustriesStub = () => ({
  agriculture: { ...INDUSTRY_STUB, supply: 0, unlocked: true },
  foodService: INDUSTRY_STUB,
  timber: { ...INDUSTRY_STUB, supply: 0 }
});

export const INDUSTRIES_UNLOCK_CONDITIONS = {
  foodService: state => state.industries.agriculture.supply > 100,
  timber: state => state.user.population > 150 && state.user.points > 1000
};

export const FOOD_PER_PERSON = 0.01;

export const POPULATION_CAPACITY_PER_POINT = 1 / 100;
export const POPULATION_GROWTH_RATE = 0.025;

export const EMPLOYMENT = {
  layoffRate: 0.02,
  employRate: 0.02
};

export const INDUSTRIES_UPDATE_SUPPLY_RATE = {
  agriculture: 0.5,
  foodService: {
    unit: 0.9,
    agriculture: -1
  },
  timber: 0.25
};
