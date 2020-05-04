import xs from "xstream";
import sampleCombine from "xstream/extra/sampleCombine";
import { div, button, h1, h2, h3, h4, a, ul, li, span, p } from "@cycle/dom";

import {
  set,
  setAll,
  update,
  growthAfterTime,
  logisticDeltaEquation
} from "../util";
import {
  FOOD_PER_PERSON,
  TIMEOUTS,
  LEAST_POPULATION,
  POPULATION_GROWTH_RATE,
  LEAST_UPPER_CAPACITY
} from "./constant";
import { whole, percentage, perSecond, relativeTime, time } from "./format";

const makeStateUpdateStream = sources => {
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
    return update(state, "user.food", food => Math.max(0, food - delta));
  });

  return xs.merge(pointsReducer$, populationReducer$, foodReducer$);
};

export default function User(sources) {
  const dom$ = sources.state.stream.map(
    ({
      user: { population, points, food, houses },
      derived: { unemployed, derivative },
      industries: { housing }
    }) =>
      div(
        ".user",
        ul([
          li(["points", " ", whole(points)]),
          li([
            "population",
            " ",
            whole(population),
            " ",
            perSecond(derivative.user.population)
          ]),
          li(["unemployment", " ", percentage(unemployed / population)]),
          li([
            span([whole(food), " food"]),
            ul([
              li(perSecond(derivative.foodService.food + derivative.user.food)),
              li([time(Math.abs(food / derivative.user.food)), " worth"])
            ])
          ]),
          housing.unlocked &&
            li([
              "houses ",
              whole(houses),
              " ",
              perSecond(derivative.housing.user.houses)
            ])
        ])
      )
  );

  const reducer$ = makeStateUpdateStream(sources);

  return {
    DOM: dom$,
    state: reducer$
  };
}
