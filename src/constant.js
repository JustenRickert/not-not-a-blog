export const TIMEOUTS = {
  saveData: 30e3,
  points: 1e3,
  population: 10e3,
  food: 3e3
};

export const makeInfoStub = () => ({
  createdDate: Date.now(),
  lastSaveDate: Date.now()
});

export const LEAST_POPULATION = 100;

export const makeUserStub = () => ({
  // TODO?
  // lastDates: {
  //   population: Date.now(),
  //   food: Date.now()
  // },
  population: LEAST_POPULATION,
  points: 0,
  food: 100
});

const INDUSTRY_STUB = {
  unlocked: true,
  employed: 0,
  supply: 0
};

export const makeIndustriesStub = () => ({
  agriculture: INDUSTRY_STUB
});

export const FOOD_PER_PERSON = 0.01;

export const POPULATION_CAPACITY_PER_POINT = 1 / 100;

export const POPULATION_GROWTH_RATE = 0.02;
