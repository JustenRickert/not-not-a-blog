import { run } from "@cycle/run";
import { withState } from "@cycle/state";
import { timeDriver } from "@cycle/time";
import xs from "xstream";
import sampleCombine from "xstream/extra/sampleCombine";
import { makeDOMDriver } from "@cycle/dom";
import isolate from "@cycle/isolate";

import { update, set, setAll, logisticDeltaEquation, omit } from "../util";
import {
  makeIndustriesStub,
  makeUserStub,
  makeInfoStub,
  TIMEOUTS,
  INDUSTRIES_UPDATE_SUPPLY_RATE,
  FOOD_PER_PERSON,
  POPULATION_GROWTH_RATE,
  POPULATION_CAPACITY,
  LEAST_UPPER_CAPACITY,
  makeAchievementsStub,
  makeProgressionStub
} from "./constant";
import {
  makeFoodServiceDerivative,
  makeHousingDerivative,
  makeUserPopulationDerivative
} from "./industry-util";
import NotNotABlog from "./not-not-a-blog";

const initState = {
  info: makeInfoStub(),
  user: makeUserStub(),
  industries: makeIndustriesStub(),
  achievements: makeAchievementsStub(),
  progression: makeProgressionStub()
};

const stubMissingTopLevel = state => {
  const initialState = Object.entries(initState);
  return setAll(
    state,
    initialState
      .filter(([stateName]) => !state[stateName])
      .map(([stateName, stub]) => [stateName, stub])
  );
};

const stubMissingAchievements = state => {
  const initialAchievements = Object.entries(initState.achievements);
  return setAll(
    state,
    initialAchievements
      .filter(([achievementName]) => !state.achievements[achievementName])
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
  .then(stubMissingTopLevel)
  .then(stubMissingAchievements)
  .then(stubMissingIndustries);

const deriveDeritave = state => ({
  user: {
    points: 1,
    population: makeUserPopulationDerivative(state),
    food: -(FOOD_PER_PERSON * state.user.population)
  },
  foodService: makeFoodServiceDerivative(state),
  agriculture: {
    agriculture:
      INDUSTRIES_UPDATE_SUPPLY_RATE.agriculture *
      state.industries.agriculture.employed
  },
  timber: {
    timber:
      INDUSTRIES_UPDATE_SUPPLY_RATE.timber * state.industries.timber.employed
  },
  housing: makeHousingDerivative(state)
});

const withDerivedLens = {
  get: state => {
    const employed = Object.values(state.industries).reduce(
      (employed, i) => employed + i.employed,
      0
    );
    return {
      ...state,
      derived: {
        employed,
        unemployed: state.user.population - employed,
        derivative: deriveDeritave(state)
      }
    };
  },
  set: (_, state) => omit(state, ["derived"])
};

function main(sources) {
  const saveData$ = xs
    .periodic(1e3 * TIMEOUTS.saveData)
    .compose(sampleCombine(sources.state.stream))
    .map(([, state]) => state)
    .map(state => set(state, "info.lastSaveDate", Date.now()));

  saveData$.addListener({
    next: data => {
      fetch("/user-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ data })
      });
    }
  });

  const notNotABlogSinks = isolate(NotNotABlog, { state: withDerivedLens })(
    sources
  );

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
