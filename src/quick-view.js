import {
  div,
  section,
  button,
  h1,
  h2,
  h3,
  h4,
  a,
  ul,
  li,
  span,
  nav
} from "@cycle/dom";
import { whole, perSecond } from "./format";

export default function QuickView(sources) {
  const dom$ = sources.state.stream.map(
    ({
      user: { population, food, houses },
      industries: { agriculture, foodService, timber, housing },
      derived: { derivative }
    }) =>
      section([
        div([
          "👤 ",
          whole(population),
          " ",
          perSecond(derivative.user.population)
        ]),
        div([
          "🚜 ",
          whole(agriculture.supply),
          " ",
          perSecond(derivative.agriculture.agriculture)
        ]),
        foodService.unlocked &&
          div([
            "🍽",
            whole(food),
            " ",
            perSecond(derivative.foodService.food + derivative.user.food)
          ]),
        timber.unlocked &&
          div([
            "🌲 ",
            whole(timber.supply),
            " ",
            perSecond(
              derivative.timber.timber + derivative.housing.timber.supply
            )
          ]),
        housing.unlocked &&
          div([
            "🏠 ",
            whole(houses),
            " ",
            perSecond(derivative.housing.user.houses)
          ])
      ])
  );

  return {
    DOM: dom$
  };
}
