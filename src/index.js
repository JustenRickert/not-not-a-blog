import { run } from "@cycle/run";
import isolate from "@cycle/isolate";
import { withState } from "@cycle/state";
import { timeDriver } from "@cycle/time";
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
  makeDOMDriver
} from "@cycle/dom";

import { makeIndustriesStub, makeUserStub, makeInfoStub } from "./constant";
import User from "./user";
import Industries from "./industries";

const initReducer = () => ({
  info: makeInfoStub(),
  user: makeUserStub(),
  industries: makeIndustriesStub()
});

function main(sources) {
  const userSinks = User(sources);
  const industriesSinks = Industries(sources);

  const dom$ = xs
    .combine(userSinks.DOM, industriesSinks.DOM)
    .map(([userDom, industriesDom]) =>
      div(".not-not-a-blog", [
        section([h2("User"), userDom]),
        section([h2("Industries"), industriesDom])
      ])
    );

  const reducer$ = xs.merge(
    xs.of(initReducer),
    userSinks.state,
    industriesSinks.state
  );

  return {
    DOM: dom$,
    state: reducer$
  };
}

run(withState(main), {
  DOM: makeDOMDriver("#root"),
  Time: timeDriver
});

if (module.hot) {
  module.hot.accept();
}

// TODO hash on save :)

// const MAIN_SCRIPT = document.currentScript.src;
// import("./create-script-hash")
//   .then(m => m.default(MAIN_SCRIPT))
//   .then(console.log);
