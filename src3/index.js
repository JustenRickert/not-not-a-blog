import xs from "xstream";
import { run } from "@cycle/run";
import { withState } from "@cycle/state";
import { timeDriver } from "@cycle/time";
import { makeDOMDriver } from "@cycle/dom";
import defaultsDeep from "lodash.defaultsdeep";

import View from "./view";
import { INIT_STATE } from "./constant";
import devDriver from "./dev-driver";

const savedState = JSON.parse(localStorage.getItem("state"));

const SAVE_TIMEOUT = 1e3;

function Main(sources) {
  const viewSinks = View(sources);

  sources.state.stream
    .compose(sources.Time.throttle(SAVE_TIMEOUT))
    .addListener({
      next: state => {
        const now = Date.now();
        const lastSave = localStorage.getItem("last-save");
        if (lastSave && now - Number(lastSave) < SAVE_TIMEOUT) {
          console.log(now - Number(lastSave), SAVE_TIMEOUT);
          console.warn("MULTIPLE TABS OPEN?");
        }
        localStorage.setItem("state", JSON.stringify(state));
        localStorage.setItem("last-save", now);
      }
    });

  const initReducer$ = xs.of(() =>
    savedState ? defaultsDeep(savedState, INIT_STATE) : INIT_STATE
  );

  const dev_reducer$ = sources.Dev.filter(a => a.type === "reducer").map(
    a => a.reducer
  );

  return {
    DOM: viewSinks.DOM,
    state: xs.merge(initReducer$, viewSinks.state, dev_reducer$)
  };
}

run(withState(Main, "state"), {
  DOM: makeDOMDriver("#root"),
  Time: timeDriver,
  Dev: devDriver
});
