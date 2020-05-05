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

const tab = (symbol, number, rate) => {
  return div(
    ".quick-view-tab",
    { style: { backgroundColor: rate < 0 ? "pink" : undefined } },
    [symbol, " ", whole(number), " ", perSecond(rate)]
  );
};

export default function QuickView(sources) {
  const dom$ = sources.state.stream.map(
    ({
      user: { population, food, houses },
      industries: { agriculture, foodService, timber, housing },
      derived: { derivative }
    }) =>
      section(".quick-view", [
        tab("👽", population, derivative.user.population),
        tab("🚜", agriculture.supply, derivative.agriculture.agriculture),
        tab("🍽", food, derivative.foodService.food + derivative.user.food),
        timber.unlocked &&
          tab(
            "🌲",
            timber.supply,
            derivative.timber.timber + derivative.housing.timber.supply
          ),
        housing.unlocked && tab("🏠", houses, derivative.housing.user.houses)
      ])
  );

  return {
    DOM: dom$
  };
}
