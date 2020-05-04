import xs from "xstream";
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
import QuickView from "./quick-view";
import { makeFoodServiceDerivative } from "./industry-util";

import "./style.css";

function intent(sources) {
  const action$ = sources.DOM.select(".tab-nav button")
    .events("click")
    .map(e => ({
      type: "switch-tab",
      which: e.target.className.replace(/-tab/, "")
    }));
  return action$;
}

export default function NotNotABlog(sources) {
  const action$ = intent(sources);

  const forwardAndBackward$ = sources.history
    .drop(1)
    .filter(({ type }) => type === undefined);

  const tab$ = xs
    .merge(
      action$.filter(a => a.type === "switch-tab").map(a => "#" + a.which),
      forwardAndBackward$.map(a => a.hash) // TODO this only goes back once... could maybe be better
    )
    .startWith(location.hash || "#game");

  const userSinks = User(sources);
  const industriesSinks = Industries(sources);
  const achievementsSinks = Achievements(sources);
  const worldSinks = {
    // TODO What happens in the world? :o
    DOM: xs.of("uh oh").mapTo(div("uh oh!"))
  };
  const quickView = QuickView(sources);

  const dom$ = xs
    .combine(
      tab$,
      sources.state.stream,
      quickView.DOM,
      userSinks.DOM,
      industriesSinks.DOM,
      worldSinks.DOM,
      achievementsSinks.DOM
    )
    .map(
      ([
        tab,
        state,
        quickViewDom,
        userDom,
        industriesDom,
        worldDom,
        achievementsDom
      ]) =>
        div(".container", [
          div(
            nav(".tab-nav", [
              button(".game-tab", "Game"),
              button(".world-tab", "World"),
              button(".achievements-tab", "Achievements"),
              section(["last save ", relativeTime(state.info.lastSaveDate)]),
              quickViewDom
            ])
          ),
          div(
            tab === "#game"
              ? div(".not-not-a-blog", [
                  section([h2("User"), userDom]),
                  section([h2("Industries"), industriesDom])
                ])
              : tab === "#world"
              ? worldDom
              : achievementsDom
          )
        ])
    );

  const reducer$ = xs.merge(
    achievementsSinks.state,
    industriesSinks.state,
    userSinks.state
  );

  return {
    DOM: dom$,
    state: reducer$,
    history: tab$
  };
}
