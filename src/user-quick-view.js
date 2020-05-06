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
import { RED_TRIANGLE, ALIEN, DINNER_PLATE, TRACTOR, HOUSE } from "./string";
import { whole, perSecond } from "./format";
import throttle from "xstream/extra/throttle";

const dropdownStat = (
  name,
  { dropdown, symbol, amount, rate, dropdownContent }
) =>
  div(".user-quick-view-stat", [
    button(".user-quick-view-stat-button", { dataset: { name } }, [
      div(span([symbol, whole(amount), perSecond(rate)]))
    ]),
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
      xs
        .merge(
          sources.DOM.select(".user-quick-view-stat-button").events("focus"),
          sources.DOM.select(".user-quick-view-stat-button").events("click")
        )
        .map(e => ({ selected: e.currentTarget.dataset.name }))
    )
    .compose(throttle(100));

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
    .combine(sources.state.stream, dropdownState$)
    .map(
      ([
        {
          user,
          industries: { agriculture, housing, foodService },
          derived: { derivative }
        },
        dropdown
      ]) =>
        div(".user-quick-view-stat", [
          div(".user-quick-view-stat-info", [
            RED_TRIANGLE,
            whole(user.points),
            perSecond(derivative.user.points)
          ]),
          div(".user-quick-view-stat-info", [
            ALIEN,
            whole(user.population),
            perSecond(derivative.user.population)
          ]),
          foodService.employed
            ? dropdownStat("food", {
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
              dropdown,
              symbol: HOUSE,
              amount: user.houses
            }),
          agriculture.employed
            ? dropdownStat("agriculture-supply", {
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
            : null
        ])
    );

  return {
    DOM: dom$
  };
}
