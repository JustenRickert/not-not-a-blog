import { POPULATION_GROWTH_RATE } from "./constant";

/**
 * :shaka: https://en.wikipedia.org/wiki/Logistic_function#In_ecology:_modeling_population_growth
 */
export const growthAfterTime = (
  original,
  secondsDiff,
  capacity,
  growthRate = POPULATION_GROWTH_RATE
) =>
  capacity /
  (1 +
    ((capacity - original) / original) * Math.E ** (-growthRate * secondsDiff));
