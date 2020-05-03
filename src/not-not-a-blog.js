import xs from "xstream";
import sampleCombine from "xstream/extra/sampleCombine";
import throttle from "xstream/extra/throttle";
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
import { makeFoodServiceDifferential } from "./industry-util";

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

  const derivative$ = sources.state.stream
    .compose(throttle(1e3 * TIMEOUTS.derivativeThrottle))
    .map(state => {
      return {
        user: {
          food: -(FOOD_PER_PERSON * state.user.population)
        },
        foodService: makeFoodServiceDifferential(state),
        agriculture: {
          agriculture:
            INDUSTRIES_UPDATE_SUPPLY_RATE.agriculture *
            state.industries.agriculture.employed
        },
        timber: {
          timber:
            INDUSTRIES_UPDATE_SUPPLY_RATE.timber *
            state.industries.timber.employed
        }
      };
    });

  const derived$ = xs
    .combine(sources.state.stream, derivative$)
    .map(([{ user, industries }, derivative]) => {
      const employed = Object.values(industries).reduce(
        (employed, i) => employed + i.employed,
        0
      );
      return {
        employed,
        unemployed: user.population - employed,
        derivative
      };
    });

  const userSinks = User(sources, { derived$ });
  const industriesSinks = Industries(sources, { derived$ });

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
