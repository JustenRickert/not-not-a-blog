import xs from "xstream";
import { run } from "@cycle/run";
import { withState } from "@cycle/state";
import { timeDriver } from "@cycle/time";
import { makeDOMDriver } from "@cycle/dom";
import defaultsDeep from "lodash.defaultsdeep";

import View from "./view";
import ensureThrottle from "./ensure-throttle";
import { upgrades } from "./upgrade";

const savedState = JSON.parse(localStorage.getItem("state"));
const initState = {
  userInformation: null,
  population: 10,
  resources: {
    stones: 0,
    metals: 0,
    wood: 0
  },
  upgrades: {
    handTools: {
      unlocked: false
    },
    furnace: {
      unlocked: false
    }
  },
  viewedChapters: ["introduction"],
  currentGameView: "user-information-entry",
  currentChapter: "introduction",
  currentPanel: "story"
};

function Main(sources) {
  const viewSinks = View(sources);

  sources.state.stream.compose(ensureThrottle(1e3)).addListener({
    next: state => localStorage.setItem("state", JSON.stringify(state))
  });

  const initReducer$ = xs.of(() =>
    savedState ? defaultsDeep(savedState, initState) : initState
  );

  return {
    DOM: viewSinks.DOM,
    state: xs.merge(initReducer$, viewSinks.state)
  };
}

run(withState(Main, "state"), {
  DOM: makeDOMDriver("#root"),
  Time: timeDriver
});
