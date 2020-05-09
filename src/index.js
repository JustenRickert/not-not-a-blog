import { run } from "@cycle/run";
import { withState } from "@cycle/state";
import { timeDriver } from "@cycle/time";
import xs from "xstream";
import sampleCombine from "xstream/extra/sampleCombine";
import { makeDOMDriver } from "@cycle/dom";

import { set, setAll } from "../util";
import {
  makeIndustriesStub,
  makeUserStub,
  makeInfoStub,
  TIMEOUTS,
  makeAchievementsStub
} from "./constant";
import NotNotABlog from "./not-not-a-blog";

const initState = {
  info: makeInfoStub(),
  user: makeUserStub(),
  industries: makeIndustriesStub(),
  achievements: makeAchievementsStub()
};

const stubMissingTopLevel = state => {
  const initialState = Object.entries(initState);
  return setAll(
    state,
    initialState
      .filter(([stateName]) => state[stateName] === undefined)
      .map(([stateName, stub]) => [stateName, stub])
  );
};

const stubMissingAchievements = state => {
  const initialAchievements = Object.entries(initState.achievements);
  return setAll(
    state,
    initialAchievements
      .filter(
        ([achievementName]) => state.achievements[achievementName] === undefined
      )
      .map(([achievementName, stub]) => [
        ["achievements", achievementName],
        stub
      ])
  );
};

const stubMissingIndustries = state => {
  const initialIndustries = Object.entries(initState.industries);
  return setAll(
    state,
    initialIndustries
      .filter(([industryName]) => state.industries[industryName] === undefined)
      .map(([industryName, industryStub]) => [
        ["industries", industryName],
        industryStub
      ])
  );
};

// TODO: user-data should maybe be fetched with a timestamp to make sure people
// aren't cheating by moving their computer time into the future
const initialDataPromise = fetch("/user-data" + "?" + "cacheBust=" + Date.now())
  .then(r => {
    if (r.status === 404) return initState;
    return r.json();
  })
  .then(x => (console.log(x), x))
  .then(stubMissingTopLevel)
  .then(stubMissingAchievements)
  .then(stubMissingIndustries);

function main(sources) {
  const saveData$ = xs
    .periodic(1e3 * TIMEOUTS.saveData)
    .compose(sampleCombine(sources.state.stream))
    .map(([, state]) => state)
    .map(state => set(state, "info.lastSaveDate", Date.now()));

  saveData$.addListener({
    next: data => {
      console.log("SAVE", data);
      fetch("/user-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ data })
      });
    }
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

// TODO hash on save :)

// const MAIN_SCRIPT = document.currentScript.src;
// import("./create-script-hash")
//   .then(m => m.default(MAIN_SCRIPT))
//   .then(console.log);
