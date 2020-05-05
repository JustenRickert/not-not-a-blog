import xs from "xstream";

import { set, setAll, update } from "../../util";
import {
  FOOD_PER_PERSON,
  TIMEOUTS,
  LEAST_POPULATION,
  POPULATION_GROWTH_RATE,
  LEAST_UPPER_CAPACITY
} from "../constant";

export default function makeUserUpdateReducer(sources) {
  const pointsReducer$ = xs
    .periodic(1e3 * TIMEOUTS.points)
    .mapTo(state =>
      update(
        state,
        "user.points",
        points =>
          points + TIMEOUTS.points * state.derived.derivative.user.points
      )
    );

  const populationReducer$ = xs
    .periodic(1e3 * TIMEOUTS.population)
    .mapTo(state => {
      const {
        user: { population },
        industries,
        derived: { employed, unemployed, derivative }
      } = state;
      const delta = TIMEOUTS.population * derivative.user.population;
      if (delta < 0) {
        const newPopulation = Math.max(LEAST_POPULATION, population + delta);
        const populationLost = population - newPopulation;
        // lose the unemployed first to prevent collapse...
        // It's like Vlad the Impaler-esque :)
        const unemployedLost = Math.min(unemployed, populationLost);
        const employedLost = populationLost - unemployedLost;
        return setAll(state, [
          ["user.population", population - unemployedLost - employedLost],
          ...Object.entries(industries).map(([industryName, industry]) => [
            ["industries", industryName, "employed"],
            industry.employed - employedLost * (industry.employed / employed)
          ])
        ]);
      } else {
        return set(state, "user.population", state.user.population + delta);
      }
    });

  const foodReducer$ = xs.periodic(1e3 * TIMEOUTS.food).mapTo(state => {
    const delta = TIMEOUTS.food * state.derived.derivative.user.food;
    return update(state, "user.food", food => Math.max(0, food + delta));
  });

  return xs.merge(pointsReducer$, populationReducer$, foodReducer$);
}
