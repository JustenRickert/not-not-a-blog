import xs from "xstream";
import sampleCombine from "xstream/extra/sampleCombine";
import { div, button, h1, h2, h3, h4, a, ul, li, span } from "@cycle/dom";

import { set, setAll, update, growthAfterTime } from "../util";
import {
  FOOD_PER_PERSON,
  TIMEOUTS,
  POPULATION_CAPACITY_PER_POINT,
  LEAST_POPULATION,
  POPULATION_GROWTH_RATE
} from "./constant";

const logisticDeltaEquation = (p, capacity, rate) =>
  p * rate * (1 - p / capacity);

const makeStateUpdateStream = (sources, { info$ }) => {
  // TODO(maybe) If points updating changes in the future, make sure to update
  // the way points are updated since last save.
  const pointsReducer$ = xs.periodic(TIMEOUTS.points).mapTo(state => {
    return update(state, "user.points", points => points + 1);
  });

  // TODO(probably not) population growth while not playing would be tricky to
  // calculate with `food` in play. If it should be supported, it needs to be
  // figured out...
  const populationReducer$ = xs
    .periodic(TIMEOUTS.population)
    .compose(sampleCombine(info$))
    .map(([, { employed }]) => state => {
      const { population } = state.user;
      const foodRequired = FOOD_PER_PERSON * population;
      const upperCapacity =
        LEAST_POPULATION + POPULATION_CAPACITY_PER_POINT * state.user.points;
      if (state.user.food < foodRequired) {
        // delta is negative here
        const delta = logisticDeltaEquation(
          population,
          LEAST_POPULATION,
          POPULATION_GROWTH_RATE
        );
        const newPopulation = Math.max(LEAST_POPULATION, population + delta);
        const newPopulationPercentage = newPopulation / population;
        const newEmployedPercentage =
          newPopulationPercentage * (employed / population);
        return setAll(state, [
          ["user.population", newPopulation],
          ...Object.entries(state.industries).map(
            ([industryName, industry]) => [
              ["industries", industryName, "employed"],
              newEmployedPercentage * industry.employed
            ]
          )
        ]);
      } else {
        const delta = logisticDeltaEquation(
          population,
          upperCapacity,
          POPULATION_GROWTH_RATE
        );
        return set(
          state,
          "user.population",
          Math.min(
            upperCapacity,
            Math.max(LEAST_POPULATION, population + delta)
          )
        );
      }
    });

  const foodReducer$ = xs.periodic(TIMEOUTS.food).mapTo(state => {
    const foodDelta = FOOD_PER_PERSON * state.user.population;
    return update(state, "user.food", food => Math.max(0, food - foodDelta));
  });

  return xs.merge(pointsReducer$, populationReducer$, foodReducer$);
};

export default function User(sources, { info$ }) {
  const user$ = sources.state.stream.map(state => state.user);

  const dom$ = xs
    .combine(user$, info$)
    .map(([{ population, points, food }, { unemployed, derivative }]) =>
      div(
        ".user",
        ul([
          li(["points", " ", points]),
          li(["population", " ", population]),
          li(["unemployment", " ", 100 * (unemployed / population), "%"]),
          li([
            "food",
            " ",
            food,
            " ",
            derivative.foodService.food + derivative.user.food,
            "/s"
          ])
        ])
      )
    );

  const reducer$ = makeStateUpdateStream(sources, { info$ });

  return {
    DOM: dom$,
    state: reducer$
  };
}
