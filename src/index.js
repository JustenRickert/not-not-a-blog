import xs from "xstream";
import { run } from "@cycle/run";
import { withState } from "@cycle/state";
import { timeDriver } from "@cycle/time";
import { makeDOMDriver } from "@cycle/dom";
import defaultsDeep from "lodash.defaultsdeep";

import View from "./view";
import ensureThrottle from "./ensure-throttle";
import { UPGRADES } from "./constant";
import devDriver from "./dev-driver";

const savedState = JSON.parse(localStorage.getItem("state"));
const initState = {
  userInformation: null,
  population: 10,
  resources: {
    art: 0,
    metals: 0,
    science: 0,
    stones: 0,
    wood: 0
  },
  upgrades: Object.keys(UPGRADES).reduce(
    (upgrades, upgradeId) => ({
      ...upgrades,
      [upgradeId]: {
        unlocked: false,
        unlockDate: null
      }
    }),
    {}
  ),
  viewedChapters: ["introduction"],
  currentUpgradeTab: "purchasable",
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

  const dev_upgradeReducer$ = sources.Dev.filter(a => a.type === "upgrade").map(
    a => a.reducer
  );

  return {
    DOM: viewSinks.DOM,
    state: xs.merge(initReducer$, viewSinks.state, dev_upgradeReducer$)
  };
}

run(withState(Main, "state"), {
  DOM: makeDOMDriver("#root"),
  Time: timeDriver,
  Dev: devDriver
});
