import xs from "xstream";
import { div, section, button, nav } from "@cycle/dom";

import { omit, sum } from "../util";
import { relativeTime } from "./format";
import { INDUSTRIES_UPDATE_SUPPLY_RATE, FOOD_PER_PERSON } from "./constant";
import Achievements from "./achievements";
import UserQuickView from "./user-quick-view";
import {
  makeFoodServiceDerivative,
  makeUserPopulationDerivative,
  makeHousingDerivative
} from "./industry-util";
import makeUserUpdateReducer from "./update-sinks/user";
import {
  makeIndustriesUnlockReducer,
  makeIndustriesUpdateReducer
} from "./update-sinks/industries";
import makeAchievementsUpdateReducer from "./update-sinks/achievements";
import GameView from "./game-view";

import "./style.css";
import isolate from "@cycle/isolate";

function makeUpdateReducer(sources) {
  const user$ = makeUserUpdateReducer();
  const industries$ = xs.merge(
    makeIndustriesUnlockReducer(),
    makeIndustriesUpdateReducer()
  );
  const achievements$ = makeAchievementsUpdateReducer(sources);
  return xs.merge(user$, industries$, achievements$);
}

function tabIntent(sources) {
  const action$ = sources.DOM.select(".tab-nav button")
    .events("click")
    .map(e => ({
      type: "switch-tab",
      which: e.target.className.replace(/-tab/, "")
    }));
  return action$;
}

function NotNotABlog(sources) {
  const tabAction$ = tabIntent(sources);

  const tab$ = xs
    .merge(
      tabAction$.filter(a => a.type === "switch-tab").map(a => "#" + a.which)
    )
    .startWith(location.hash || "#game");

  const achievementsSinks = Achievements(sources);
  const worldSinks = {
    // TODO What happens in the world? :o
    DOM: xs.of("uh oh").mapTo(div("TODO! :)"))
  };
  const userQuickView = UserQuickView(sources);
  const gameView = GameView(sources);

  const dom$ = xs
    .combine(
      tab$,
      sources.state.stream,
      userQuickView.DOM,
      worldSinks.DOM,
      achievementsSinks.DOM,
      gameView.DOM
    )
    .map(
      ([
        tab,
        state,
        userQuickViewDom,
        worldDom,
        achievementsDom,
        gameViewDom
      ]) =>
        div(".container", [
          div(
            nav(".tab-nav", [
              button(".game-tab", "Game"),
              button(".world-tab", "World"),
              button(".achievements-tab", "Achievements"),
              section([
                "last save ",
                relativeTime(state.info.lastSaveDate),
                " ago"
              ])
            ])
          ),
          tab === "#game"
            ? div(".game", [userQuickViewDom, gameViewDom])
            : tab === "#world"
            ? worldDom
            : achievementsDom
        ])
    );

  const updateReducer$ = makeUpdateReducer(sources);
  const reducer$ = xs.merge(updateReducer$, gameView.state);

  return {
    DOM: dom$,
    state: reducer$
  };
}

const deriveDerivative = state => ({
  user: {
    points: 1,
    population: makeUserPopulationDerivative(state),
    food: -(FOOD_PER_PERSON * state.user.population)
  },
  foodService: makeFoodServiceDerivative(state),
  agriculture: {
    supply:
      INDUSTRIES_UPDATE_SUPPLY_RATE.agriculture *
      state.industries.agriculture.employed
  },
  timber: {
    supply:
      INDUSTRIES_UPDATE_SUPPLY_RATE.timber * state.industries.timber.employed
  },
  housing: makeHousingDerivative(state),
  education: {
    supply:
      INDUSTRIES_UPDATE_SUPPLY_RATE.education *
      state.industries.education.employed
  },
  energy: {
    supply:
      INDUSTRIES_UPDATE_SUPPLY_RATE.energy * state.industries.energy.employed
  },
  health: {
    supply:
      INDUSTRIES_UPDATE_SUPPLY_RATE.health * state.industries.health.employed
  }
});

const withDerivedLens = {
  get: state => {
    const employed = sum(
      Object.values(state.industries),
      industry => industry.employed
    );
    return {
      ...state,
      derived: {
        employed,
        unemployed: state.user.population - employed,
        derivative: deriveDerivative(state)
      }
    };
  },
  set: (_, state) => omit(state, ["derived"])
};

export default isolate(NotNotABlog, { state: withDerivedLens });
