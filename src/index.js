import { run } from "@cycle/run";
import isolate from "@cycle/isolate";
import { withState } from "@cycle/state";
import { timeDriver } from "@cycle/time";
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
  span,
  makeDOMDriver
} from "@cycle/dom";

import {
  makeIndustriesStub,
  makeUserStub,
  makeInfoStub,
  TIMEOUTS
} from "./constant";
import User from "./user";
import Industries from "./industries";
import { update, set } from "../util";

const initState = {
  info: makeInfoStub(),
  user: makeUserStub(),
  industries: makeIndustriesStub()
};

// TODO: user-data should maybe be fetched with a timestamp to make sure people
// aren't cheating by moving their computer time into the future
const initialDataPromise = fetch("/user-data").then(r => {
  if (r.status === 404) return initState;
  return r
    .json()
    .then(state =>
      update(
        state,
        "user.points",
        points =>
          points + (Date.now() - state.info.lastSaveDate) / TIMEOUTS.points
      )
    );
});

function main(sources) {
  const saveData$ = xs
    .periodic(TIMEOUTS.saveData)
    .compose(sampleCombine(sources.state.stream))
    .map(([, state]) => state)
    .map(state => set(state, "info.lastSaveDate", Date.now()));

  saveData$.addListener({
    next: data =>
      fetch("/user-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ data })
      })
  });

  const userSinks = User(sources);
  const industriesSinks = Industries(sources);

  const dom$ = xs
    .combine(sources.state.stream, userSinks.DOM, industriesSinks.DOM)
    .map(([state, userDom, industriesDom]) =>
      div(".not-not-a-blog", [
        div(["last save ", state.info.lastSaveDate]),
        section([h2("User"), userDom]),
        section([h2("Industries"), industriesDom])
      ])
    );

  const reducer$ = xs.merge(
    xs.fromPromise(initialDataPromise).map(initialState => () => initialState),
    userSinks.state,
    industriesSinks.state,
    saveData$.map(state => () => state)
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
