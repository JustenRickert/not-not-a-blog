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
  POPULATION_CAPACITY_PER_POINT,
  LEAST_POPULATION,
  POPULATION_GROWTH_RATE,
  LEAST_UPPER_CAPACITY
} from "./constant";
import { whole, percentage, perSecond, relativeTime, time } from "./format";

const makeStateUpdateStream = (sources, { derived$ }) => {
  // TODO(maybe) If points updating changes in the future, make sure to update
  // the way points are updated since last save.
  const pointsReducer$ = xs.periodic(1e3 * TIMEOUTS.points).mapTo(state => {
    return update(state, "user.points", points => points + TIMEOUTS.points);
  });

  // TODO(probably not) population growth while not playing would be tricky to
  // calculate with `food` in play. If it should be supported, it needs to be
  // figured out...
  const populationReducer$ = xs
    .periodic(1e3 * TIMEOUTS.population)
    .compose(sampleCombine(derived$))
    .map(([, { employed, derivative }]) => state => {
      const { population } = state.user;
      const foodRequired = FOOD_PER_PERSON * TIMEOUTS.population * population;
      if (state.user.food < foodRequired) {
        // delta is negative here
        const delta =
          TIMEOUTS.population *
          logisticDeltaEquation(
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
        const delta = TIMEOUTS.population * derivative.user.population;
        return set(
          state,
          "user.population",
          // TODO Need min-max here?
          population + delta
        );
      }
    });

  const foodReducer$ = xs.periodic(1e3 * TIMEOUTS.food).mapTo(state => {
    const foodDelta = FOOD_PER_PERSON * TIMEOUTS.food * state.user.population;
    return update(state, "user.food", food => Math.max(0, food - foodDelta));
  });

  return xs.merge(pointsReducer$, populationReducer$, foodReducer$);
};

export default function User(sources) {
  const user$ = sources.state.stream.map(state => state.user);
  const derived$ = sources.state.stream.map(state => state.derived);

  const dom$ = xs
    .combine(user$, derived$)
    .map(([{ population, points, food, houses }, { unemployed, derivative }]) =>
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
          li([
            "houses ",
            whole(houses),
            " ",
            perSecond(derivative.housing.user.houses)
          ])
        ])
      )
    );

  const reducer$ = makeStateUpdateStream(sources, { derived$ });

  return {
    DOM: dom$,
    state: reducer$
  };
}
