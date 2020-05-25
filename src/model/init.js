import xs from "xstream";
import defaultsDeep from "lodash.defaultsdeep";

import { INDUSTRIES } from "../constant";

const initState = {
  points: 0,
  market: [],
  industry: Object.keys(INDUSTRIES).reduce(
    (industry, key) => ({
      ...industry,
      [key]: {
        supply: key === "stone" ? 1 : 0,
        stock: key === "stone" ? 1 : 0
      }
    }),
    {}
  ),
  userInformation: null
};

export default function makeInit(sources) {
  sources.state.stream
    // TODO uncomment(?)
    // .compose(sources.time.throttle(60e3))
    // .compose(sources.time.delay(30e3))
    .addListener({
      next: state => localStorage.setItem("state", JSON.stringify(state))
    });
  return xs.of(
    () =>
      defaultsDeep(JSON.parse(localStorage.getItem("state")), initState) ||
      initState
  );
}
