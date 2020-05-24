import xs from "xstream";
import sampleCombine from "xstream/extra/sampleCombine";
import defaultsDeep from "lodash.defaultsdeep";

import { set } from "../../util";
// import ensureThrottle from "../ensure-throttle";
import roughlyPeriodic from "../roughly-periodic";

import { STORY } from "../constant";

const STORY_EVENT_TIMEOUT = 5e3;

const routeInitState = {
  route: "story",
  story: {
    section: "table-of-contents", // 'table-of-contents' | 'chapter'
    chapter: "introduction"
  },
  enterprise: "user-information-entry"
};

function init(sources) {
  sources.route.stream
    // TODO uncomment(?)
    // .compose(ensureThrottle(60e3))
    .addListener({
      next: state => localStorage.setItem("route", JSON.stringify(state))
    });
  return xs.of(() => {
    const data = JSON.parse(localStorage.getItem("route"));
    return data ? defaultsDeep(data, routeInitState) : routeInitState;
  });
}

function storyEvents(sources) {
  return roughlyPeriodic(sources.time.createOperator, STORY_EVENT_TIMEOUT)
    .compose(sampleCombine(sources.state.stream))
    .map(([, state]) => routeState => {
      const storyEvent = Object.values(STORY).find(({ condition }) =>
        condition(state)
      );
      if (storyEvent && storyEvent.route !== routeState.enterprise)
        return set(routeState, "enterprise", storyEvent.route);
      return routeState;
    });
}

export default function routing(sources) {
  return xs.merge(init(sources), storyEvents(sources));
}
