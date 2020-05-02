import xs from "xstream";
import { div, button, h1, h2, h3, h4, a, ul, li, span } from "@cycle/dom";

import { update, growthAfterTime } from "../util";
import {
  FOOD_PER_PERSON,
  TIMEOUTS,
  POPULATION_CAPACITY_PER_POINT,
  LEAST_POPULATION,
  POPULATION_GROWTH_RATE
} from "./constant";

const logisticDeltaEquation = (p, capacity, rate) =>
  p * rate * (1 - p / capacity);

const makeUserUpdateStream = sources => {
  // TODO(maybe) If points updating changes in the future, make sure to update
  // the way points are updated since last save.
  const pointsReducer$ = xs.periodic(TIMEOUTS.points).mapTo(user => {
    return update(user, "points", points => points + 1);
  });

  // TODO(probably not) population growth while not playing would be tricky to
  // calculate with `food` in play. If it should be supported, it needs to be
  // figured out...
  const populationReducer$ = xs.periodic(TIMEOUTS.population).mapTo(user => {
    const foodRequired = FOOD_PER_PERSON * user.population;
    const upperCapacity =
      LEAST_POPULATION + POPULATION_CAPACITY_PER_POINT * user.points;
    const delta =
      user.food < foodRequired
        ? logisticDeltaEquation(
            user.population,
            LEAST_POPULATION,
            POPULATION_GROWTH_RATE
          )
        : logisticDeltaEquation(
            user.population,
            upperCapacity,
            POPULATION_GROWTH_RATE
          );
    return update(user, "population", population =>
      Math.min(upperCapacity, Math.max(LEAST_POPULATION, population + delta))
    );
  });

  const foodReducer$ = xs.periodic(TIMEOUTS.food).mapTo(user => {
    const foodDelta = FOOD_PER_PERSON * user.population;
    return update(user, "food", food => Math.max(0, food - foodDelta));
  });

  return xs.merge(pointsReducer$, populationReducer$, foodReducer$);
};

export default function User(sources, { info$ }) {
  const user$ = sources.state.stream.map(state => state.user);

  const dom$ = xs
    .combine(user$, info$)
    .map(([{ population, points, food }, info]) =>
      div(
        ".user",
        ul([
          li(["points", " ", points]),
          li(["population", " ", population]),
          li(["unemployment", " ", 100 * (info.unemployed / population), "%"]),
          li(["food", " ", food])
        ])
      )
    );

  const userReducer$ = makeUserUpdateStream(sources);

  return {
    DOM: dom$,
    state: userReducer$.map(reducer => state => update(state, "user", reducer))
  };
}
