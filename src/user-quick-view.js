import xs from "xstream";
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

import { set, update } from "../util";
import {
  RED_TRIANGLE,
  ALIEN,
  DINNER_PLATE,
  TRACTOR,
  HOUSE,
  TREE
} from "./string";
import { whole, perSecond, percentage } from "./format";
import throttle from "xstream/extra/throttle";
import { populationCapacity } from "./industry-util";

import "./user-quick-view.css";

const maybeStatButton = (condition, props, children) =>
  condition
    ? button(".user-quick-view-stat-button", props, children)
    : div(".user-quick-view-stat-info", children);

const dropdownStat = (
  name,
  { dropdown, symbol, amount, rate, dropdownContent, state }
) =>
  div(".user-quick-view-stat", [
    maybeStatButton(
      dropdownContent && state.progression.introduction,
      { dataset: { name } },
      [symbol, whole(amount), perSecond(rate)]
    ),
    dropdown.selected === name && dropdownContent
      ? div(".dropdown", [
          div("#triangle"),
          div(".dropdown-content", dropdownContent)
        ])
      : null
  ]);

export default function UserQuickView(sources) {
  const click$ = xs
    .merge(
      sources.DOM.select(".user-quick-view-stat-button")
        .events("blur")
        .mapTo({ selected: "" }),
      sources.DOM.select(".user-quick-view-stat-button")
        .events("click")
        .map(e => ({ selected: e.currentTarget.dataset.name }))
    )
    .compose(throttle(200));

  const dropdownState$ = xs
    .merge(
      click$.map(action => state =>
        update(state, "selected", selected =>
          action.selected === selected ? "" : action.selected
        )
      )
    )
    .fold((state, reducer) => reducer(state), {
      selected: ""
    });

  const dom$ = xs
    .combine(sources.state.stream.compose(throttle(100)), dropdownState$)
    .map(([state, dropdown]) => {
      const {
        user,
        industries: { agriculture, housing, foodService, timber },
        derived: { unemployed, derivative }
      } = state;
      return div(".user-quick-view-stat", [
        div(".user-quick-view-stat-info", [
          RED_TRIANGLE,
          whole(user.points),
          perSecond(derivative.user.points)
        ]),
        dropdownStat("user", {
          state,
          dropdown,
          symbol: ALIEN,
          amount: user.population,
          rate: derivative.user.population,
          dropdownContent: ul([
            li(["unemployment ", percentage(unemployed / user.population)]),
            user.houses
              ? li(["pop. cap. ", whole(populationCapacity(state))])
              : null
          ])
        }),
        foodService.employed
          ? dropdownStat("food", {
              state,
              dropdown,
              symbol: DINNER_PLATE,
              amount: user.food,
              rate: derivative.user.food + derivative.foodService.food,
              dropdownContent: ul([
                li([ALIEN, perSecond(derivative.user.food)]),
                li([DINNER_PLATE, perSecond(derivative.foodService.food)])
              ])
            })
          : null,
        housing.unlocked &&
          dropdownStat("houses", {
            state,
            dropdown,
            symbol: HOUSE,
            amount: user.houses,
            rate: derivative.housing.user.houses
          }),
        agriculture.employed
          ? dropdownStat("agriculture-supply", {
              state,
              dropdown,
              symbol: TRACTOR,
              amount: agriculture.supply,
              rate:
                derivative.agriculture.agriculture +
                derivative.foodService.agriculture,
              dropdownContent: ul([
                li([TRACTOR, perSecond(derivative.agriculture.agriculture)]),
                li([
                  DINNER_PLATE,
                  perSecond(derivative.foodService.agriculture)
                ])
              ])
            })
          : null,
        timber.employed
          ? dropdownStat("timber-supply", {
              state,
              dropdown,
              symbol: TREE,
              amount: timber.supply,
              rate: derivative.timber.timber + derivative.housing.timber.supply,
              dropdownContent: housing.employed
                ? ul([
                    li([TREE, perSecond(derivative.timber.timber)]),
                    li([HOUSE, perSecond(derivative.housing.timber.supply)])
                  ])
                : null
            })
          : null
      ]);
    });

  return {
    DOM: dom$
  };
}
