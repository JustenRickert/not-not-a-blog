import xs from "xstream";
import { run } from "@cycle/run";
import { makeDOMDriver } from "@cycle/dom";
import { withState } from "@cycle/state";

import init from "./model/init";
import points from "./model/points";
import market from "./model/market";
import Routing from "./routing";
import devDriver from "./dev-driver";

function main(sources) {
  sources.state.stream.addListener({
    // next: console.log,
    error: console.error
  }); // required!

  sources.dev.addListener({
    error: console.error
  }); // required!

  const sinks = Routing(sources);

  const reducer$ = xs.merge(
    init(sources),
    points(sources),
    market(sources),
    sinks.state || xs.empty(),
    sources.dev.filter(a => a.type === "reducer").map(a => a.reducer)
  );

  return {
    dom: sinks.dom,
    state: reducer$
  };
}

run(withState(main, "state"), {
  dom: makeDOMDriver("#root"),
  dev: devDriver
});
