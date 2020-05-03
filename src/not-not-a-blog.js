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
import { makeFoodServiceDerivative } from "./industry-util";

import "./style.css";

function intent(sources) {
  const action$ = sources.DOM.select(".tab button")
    .events("click")
    .map(e => ({ type: "switch-tab", which: e.target.className }));
  return action$;
}

export default function NotNotABlog(sources) {
  const action$ = intent(sources);

  const tab$ = action$
    .filter(a => a.type === "switch-tab")
    .map(a => a.which)
    .startWith("game-tab");

  const userSinks = User(sources);
  const industriesSinks = Industries(sources);

  const dom$ = xs
    .combine(tab$, sources.state.stream, userSinks.DOM, industriesSinks.DOM)
    .map(([tab, state, userDom, industriesDom]) =>
      div([
        nav(".tab", [
          button(".game-tab", "game"),
          button(".achievements-tab", "achievements")
        ]),
        section(["last save ", relativeTime(state.info.lastSaveDate)]),
        tab === "game-tab"
          ? div(".not-not-a-blog", [
              section([h2("User"), userDom]),
              section([h2("Industries"), industriesDom])
            ])
          : div("achievements")
      ])
    );

  const reducer$ = xs.merge(userSinks.state, industriesSinks.state);

  return {
    DOM: dom$,
    state: reducer$
  };
}
