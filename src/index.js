import xs from "xstream";
import sampleCombine from "xstream/extra/sampleCombine";
import { run } from "@cycle/run";
import { makeDOMDriver } from "@cycle/dom";
import { withState } from "@cycle/state";
import { timeDriver } from "@cycle/time";

import init from "./model/init";
import points from "./model/points";
import Routing from "./routing";

function main(sources) {
  sources.state.stream.addListener({
    // next: console.log,
    error: console.error
  }); // required!

  const sinks = Routing(sources);

  const reducer$ = xs.merge(
    init(sources),
    points(sources),
    sinks.state || xs.empty()
  );

  return {
    dom: sinks.dom,
    state: reducer$
  };
}

run(withState(main, "state"), {
  dom: makeDOMDriver("#root"),
  time: timeDriver
});
