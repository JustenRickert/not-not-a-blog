import xs from "xstream";
import sampleCombine from "xstream/extra/sampleCombine";
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
import { TIMEOUTS } from "./constant";
import User from "./user";
import Industries from "./industries";

export default function NotNotABlog(sources) {
  const info$ = sources.state.stream.map(({ user, industries }) => {
    const employed = Object.values(industries).reduce(
      (employed, i) => employed + i.employed,
      0
    );
    return {
      employed,
      unemployed: user.population - employed
    };
  });

  const userSinks = User(sources, { info$ });
  const industriesSinks = Industries(sources, { info$ });

  const dom$ = xs
    .combine(sources.state.stream, userSinks.DOM, industriesSinks.DOM)
    .map(([state, userDom, industriesDom]) =>
      div(".not-not-a-blog", [
        div(["last save ", state.info.lastSaveDate]),
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
