import xs from "xstream";
import { div, button, ul, li } from "@cycle/dom";

import { update } from "../util";
import {
  RED_TRIANGLE,
  ALIEN,
  DINNER_PLATE,
  TRACTOR,
  HOUSE,
  TREE,
  OPEN_BOOK,
  ELECTRICITY,
  AESCULAPIUS
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
  { dropdown, symbol, amount, rate, dropdownContent }
) =>
  div(".user-quick-view-stat", [
    maybeStatButton(dropdownContent, { dataset: { name } }, [
      symbol,
      whole(amount),
      typeof rate === "number" ? perSecond(rate) : rate
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
        industries: {
          agriculture,
          housing,
          foodService,
          timber,
          education,
          energy,
          health
        },
        derived: { unemployed, derivative }
      } = state;
      return div(".user-quick-view", [
        dropdownStat("points", {
          state,
          dropdown,
          symbol: RED_TRIANGLE,
          amount: user.points,
          rate: derivative.user.points
        }),
        dropdownStat("population", {
          state,
          dropdown,
          symbol: ALIEN,
          amount: user.population,
          rate:
            derivative.user.population > 0
              ? derivative.user.population *
                derivative.user.multiplier.population
              : " PAUSED",
          dropdownContent: ul([
            li([ALIEN, perSecond(derivative.user.population)]),
            li([
              AESCULAPIUS,
              perSecond(
                derivative.user.population *
                  (derivative.user.multiplier.population - 1)
              )
            ]),
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
              rate:
                derivative.user.food +
                derivative.foodService.food * derivative.foodService.multiplier,
              dropdownContent: ul([
                li([ALIEN, perSecond(derivative.user.food)]),
                li([DINNER_PLATE, perSecond(derivative.foodService.food)]),
                education.unlocked &&
                  li([
                    OPEN_BOOK,
                    perSecond(
                      derivative.foodService.food *
                        (derivative.foodService.multiplier - 1)
                    )
                  ])
              ])
            })
          : null,
        housing.unlocked &&
          dropdownStat("houses", {
            state,
            dropdown,
            symbol: HOUSE,
            amount: user.houses,
            rate:
              derivative.housing.user.houses * derivative.housing.multiplier,
            dropdownContent: ul([
              li([HOUSE, perSecond(derivative.housing.user.houses)]),
              li([
                ELECTRICITY,
                perSecond(
                  derivative.housing.user.houses *
                    (derivative.housing.multiplier - 1)
                )
              ])
            ])
          }),
        agriculture.employed
          ? dropdownStat("agriculture-supply", {
              state,
              dropdown,
              symbol: TRACTOR,
              amount: agriculture.supply,
              rate:
                derivative.foodService.agriculture +
                derivative.agriculture.supply *
                  derivative.agriculture.multiplier.supply,
              dropdownContent: ul([
                li([TRACTOR, perSecond(derivative.agriculture.supply)]),
                li([
                  OPEN_BOOK,
                  perSecond(
                    derivative.agriculture.supply *
                      (derivative.agriculture.multiplier.supply - 1)
                  )
                ]),
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
              rate:
                derivative.housing.timber +
                derivative.timber.supply * derivative.timber.multiplier.supply,
              dropdownContent: housing.employed
                ? ul([
                    li([TREE, perSecond(derivative.timber.supply)]),
                    li([HOUSE, perSecond(derivative.housing.timber)]),
                    li([
                      ELECTRICITY,
                      perSecond(
                        derivative.timber.supply *
                          (derivative.timber.multiplier.supply - 1)
                      )
                    ])
                  ])
                : null
            })
          : null,
        education.employed
          ? dropdownStat("education-supply", {
              state,
              dropdown,
              symbol: OPEN_BOOK,
              amount: education.supply,
              rate: derivative.education.supply
            })
          : null,
        energy.employed
          ? dropdownStat("energy-supply", {
              state,
              dropdown,
              symbol: ELECTRICITY,
              amount: energy.supply,
              rate: derivative.energy.supply
            })
          : null,
        health.employed
          ? dropdownStat("health-supply", {
              state,
              dropdown,
              symbol: AESCULAPIUS,
              amount: health.supply,
              rate: derivative.health.supply
            })
          : null
      ]);
    });

  return {
    DOM: dom$
  };
}
