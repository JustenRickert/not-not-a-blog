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

import { RED_TRIANGLE, ALIEN, DINNER_PLATE, TRACTOR } from "./string";
import { whole } from "./format";

export default function UserQuickView(sources) {
  const dom$ = sources.state.stream.map(
    ({ user, industries: { agriculture, housing, foodService } }) =>
      div(".user-quick-view", [
        div(".user-quick-view-stat", [RED_TRIANGLE, whole(user.points)]),
        div(".user-quick-view-stat", [ALIEN, whole(user.population)]),
        foodService.employed
          ? div(".user-quick-view-stat", [DINNER_PLATE, whole(user.food)])
          : null,
        housing.unlocked &&
          div(".user-quick-view-stat", ["🏠", whole(user.houses)]),
        agriculture.employed
          ? div(".user-quick-view-stat", [TRACTOR, whole(agriculture.supply)])
          : null
      ])
  );

  return {
    DOM: dom$
  };
}
