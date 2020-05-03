export const TIMEOUTS = {
  saveData: 30,
  points: 1,
  population: 10,
  food: 3,
  unlockIndustries: 7,
  unlockAchievements: 13,
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
    },
    housing: {
      timberToHouses: 1
    }
  }
};

export const INDUSTRIES_UPDATE_SUPPLY_RATE = {
  agriculture: 0.1,
  foodService: {
    unit: 0.12,
    agriculture: -1.5
  },
  timber: 0.75,
  housing: {
    unit: 1 / 1000,
    timber: -1000
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
  houses: 0
});

const INDUSTRY_STUB = {
  unlocked: false,
  employed: 0
};

export const makeIndustriesStub = () => ({
  agriculture: { ...INDUSTRY_STUB, supply: 0, unlocked: true },
  foodService: INDUSTRY_STUB,
  timber: { ...INDUSTRY_STUB, supply: 0 },
  housing: INDUSTRY_STUB
});

export const INDUSTRIES_UNLOCK_CONDITIONS = {
  foodService: state => state.industries.agriculture.supply > 100,
  timber: state => state.user.population > 150 && state.user.points > 1000,
  housing: state =>
    state.user.population > 2250 && state.industries.timber.supply > 1e6
};

export const ACHIEVEMENTS_LABELS = {
  populationGrower10_000: "Population Grower Ten-thousand",
  populationGrower100_000: "Population Grower One-hundred-thousand",
  populationGrower1_000_000: "Population Grower One-million",
  foodStockpiler1_000_000: "Food Stockpiler One-million",
  houseBuilder1_000_000: "House Builder One-million",
  agricultureStockpiler1_000_000: "Agriculture Stockpiler One-million",
  agricultureEmployer10_000: "Agriculture Employer Ten-thousand",
  timberStockpiler1_000_000: "Timber Stockpiler One-million",
  timberEmployer10_000: "Timber Employer Ten-thousand"
};

export const ACHIEVEMENTS_UNLOCK_CONDITIONS = {
  populationGrower10_000: state => state.user.population > 10e3,
  populationGrower100_000: state => state.user.population > 100e3,
  populationGrower1_000_000: state => state.user.population > 1e6,
  foodStockpiler1_000_000: state => state.user.food > 1e6,
  houseBuilder1_000_000: state => state.user.houses > 1e6,
  agricultureStockpiler1_000_000: state =>
    state.industries.agriculture.supply > 1e6,
  agricultureEmployer10_000: state =>
    state.industries.agriculture.employed > 10e3,
  timberStockpiler1_000_000: state => state.industries.timber.supply > 1e6,
  timberEmployer10_000: state => state.industries.timber.employed > 10e3
};

export const makeAchievementsStub = () =>
  Object.keys(ACHIEVEMENTS_LABELS).reduce(
    (acc, key) => ({
      ...acc,
      [key]: {
        unlocked: false,
        unlockDate: -1
      }
    }),
    {}
  );

export const FOOD_PER_PERSON = 0.01;

export const POPULATION_CAPACITY = {
  perPoint: 1 / 10,
  perHouse: 5
};

export const POPULATION_GROWTH_RATE = 0.00025;

export const EMPLOYMENT = {
  layoffRate: 0.02,
  employRate: 0.02
};
