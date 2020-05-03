import { run } from "@cycle/run";
import isolate from "@cycle/isolate";
import { withState } from "@cycle/state";
import { timeDriver } from "@cycle/time";
import xs from "xstream";
import sampleCombine from "xstream/extra/sampleCombine";
import { makeDOMDriver } from "@cycle/dom";

import { update, set, setAll } from "../util";
import {
  makeIndustriesStub,
  makeUserStub,
  makeInfoStub,
  TIMEOUTS
} from "./constant";
import NotNotABlog from "./not-not-a-blog";

const initState = {
  info: makeInfoStub(),
  user: makeUserStub(),
  industries: makeIndustriesStub()
};

const stubMissingIndustries = state => {
  const initialIndustries = Object.entries(initState.industries);
  return setAll(
    state,
    initialIndustries
      .filter(([industryName]) => !state.industries[industryName])
      .map(([industryName, industryStub]) => [
        ["industries", industryName],
        industryStub
      ])
  );
};

// TODO: user-data should maybe be fetched with a timestamp to make sure people
// aren't cheating by moving their computer time into the future
const initialDataPromise = fetch("/user-data")
  .then(r => {
    if (r.status === 404) return initState;
    return r
      .json()
      .then(state =>
        update(
          state,
          "user.points",
          points => points + (Date.now() - state.info.lastSaveDate) / 1000
        )
      );
  })
  .then(stubMissingIndustries);

function main(sources) {
  const saveData$ = xs
    .periodic(1e3 * TIMEOUTS.saveData)
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

  const notNotABlogSinks = NotNotABlog(sources);

  return {
    DOM: notNotABlogSinks.DOM,
    state: xs.merge(
      xs
        .fromPromise(initialDataPromise)
        .map(initialState => () => initialState),
      saveData$.map(state => () => state),
      notNotABlogSinks.state
    )
  };
}

run(withState(main), {
  DOM: makeDOMDriver("#root"),
  Time: timeDriver
});

if (module.hot) {
  module.hot.accept("./index.js", () => {
    // TODO probably a way to do this nicer :shrug:
    window.location.reload();
  });
}

// TODO hash on save :)

// const MAIN_SCRIPT = document.currentScript.src;
// import("./create-script-hash")
//   .then(m => m.default(MAIN_SCRIPT))
//   .then(console.log);
