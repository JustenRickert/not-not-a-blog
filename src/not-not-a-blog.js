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
  span
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
import { makeFoodServiceDelta } from "./industry-util";

export default function NotNotABlog(sources) {
  const derivative$ = sources.state.stream
    .compose(throttle(1e3 * TIMEOUTS.derivativeThrottle))
    .map(state => {
      return {
        user: {
          food: -(FOOD_PER_PERSON * state.user.population)
        },
        foodService: makeFoodServiceDelta(state),
        agriculture: {
          agriculture:
            INDUSTRIES_UPDATE_SUPPLY_RATE.agriculture *
            state.industries.agriculture.employed
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
    .combine(sources.state.stream, userSinks.DOM, industriesSinks.DOM)
    .map(([state, userDom, industriesDom]) =>
      div(".not-not-a-blog", [
        div(["last save ", relativeTime(state.info.lastSaveDate)]),
        section([h2("User"), userDom]),
        section([h2("Industries"), industriesDom])
      ])
    );

  const reducer$ = xs.merge(userSinks.state, industriesSinks.state);

  return {
    DOM: dom$,
    state: reducer$
  };
}
