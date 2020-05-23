import xs from "xstream";
import defaultsDeep from "lodash.defaultsdeep";

import ensureThrottle from "../ensure-throttle";

const routeInitState = {
  route: "story",
  story: {
    section: "table-of-contents", // 'table-of-contents' | 'chapter'
    chapter: "introduction"
  },
  enterprise: "user-information-entry"
};

export default function routing(sources) {
  sources.route.stream
    // TODO uncomment(?)
    // .compose(ensureThrottle(60e3))
    .addListener({
      next: state => localStorage.setItem("route", JSON.stringify(state))
    });
  const routeInit = xs.of(() => {
    const data = JSON.parse(localStorage.getItem("route"));
    return data ? defaultsDeep(data, routeInitState) : routeInitState;
  });
  return routeInit;
}
