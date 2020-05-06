import xs from "xstream";
import isolate from "@cycle/isolate";
import sampleCombine from "xstream/extra/sampleCombine";
import throttle from "xstream/extra/throttle";
import debounce from "xstream/extra/debounce";
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

import { updateAll, setAll } from "../util";
import { relativeTime } from "./format";
import {
  TIMEOUTS,
  INDUSTRIES_UPDATE_SUPPLY_RATE,
  FOOD_PER_PERSON
} from "./constant";
import User from "./user";
import Industries from "./industries";
import Achievements from "./achievements";
import UserQuickView from "./user-quick-view";
import { makeFoodServiceDerivative } from "./industry-util";
import makeUserUpdateReducer from "./update-sinks/user";
import makeIndustriesUpdateReducer from "./update-sinks/industries";
import makeAchievementsUpdateReducer from "./update-sinks/achievements";
import makeEmploymentSinks from "./actions/employment";
import GameView from "./game-view";

import "./style.css";

function makeUpdateReducer(sources) {
  const user$ = makeUserUpdateReducer(sources);
  const industries$ = makeIndustriesUpdateReducer(sources);
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

export default function NotNotABlog(sources) {
  const tabAction$ = tabIntent(sources);

  const tab$ = xs
    .merge(
      tabAction$.filter(a => a.type === "switch-tab").map(a => "#" + a.which)
    )
    .startWith(location.hash || "#game");

  const userSinks = User(sources);
  const industriesSinks = Industries(sources);
  const achievementsSinks = Achievements(sources);
  const worldSinks = {
    // TODO What happens in the world? :o
    DOM: xs.of("uh oh").mapTo(div("uh oh!"))
  };
  const userQuickView = UserQuickView(sources);
  const gameView = GameView(sources);

  const dom$ = xs
    .combine(
      tab$,
      sources.state.stream,
      userQuickView.DOM,
      userSinks.DOM,
      industriesSinks.DOM,
      worldSinks.DOM,
      achievementsSinks.DOM,
      gameView.DOM
    )
    .map(
      ([
        tab,
        state,
        userQuickViewDom,
        userDom,
        industriesDom,
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
              section(["last save ", relativeTime(state.info.lastSaveDate)])
            ])
          ),
          tab === "#game"
            ? div(".game", [
                userQuickViewDom,
                gameViewDom,
                div(".not-not-a-blog", [
                  section([h2("User"), userDom]),
                  section([h2("Industries"), industriesDom])
                ])
              ])
            : tab === "#world"
            ? worldDom
            : achievementsDom
        ])
    );

  const updateReducer$ = makeUpdateReducer(sources);
  const reducer$ = xs.merge(
    updateReducer$,
    industriesSinks.state,
    gameView.state
  );

  return {
    DOM: dom$,
    state: reducer$
  };
}
