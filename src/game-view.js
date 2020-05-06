import xs from "xstream";
import dropRepeats from "xstream/extra/dropRepeats";
import delay from "xstream/extra/delay";
import isolate from "@cycle/isolate";
import {
  div,
  section,
  button,
  h1,
  h2,
  h3,
  h4,
  i,
  a,
  p,
  ul,
  li,
  span,
  nav
} from "@cycle/dom";

import { which, cases, set, omit, not } from "../util";
import { whole } from "./format";

const isProgressed = key => state => Boolean(state.progression[key]);

const whichProgression = which(
  [not(isProgressed("makeFirstWorker")), "make-first-worker"],
  [not(isProgressed("introduction")), "introduction"],
  [not(isProgressed("beginning")), "beginning"]
);

const isCurrentView = key => state => state.currentView === key;

const whichView = which(
  [
    isCurrentView("make-first-worker"),
    import("./game-views/make-first-worker")
  ],
  [isCurrentView("introduction"), import("./game-views/introduction")],
  [isCurrentView("beginning"), import("./game-views/beginning")]
);

function GameView(sources) {
  const sinks$ = sources.state.stream
    .compose(dropRepeats((s1, s2) => s1.currentView === s2.currentView))
    .debug("currentView")
    .map(whichView)
    .map(xs.fromPromise)
    .flatten()
    .map(({ default: View }) => View(sources));

  return {
    DOM: sinks$
      .map(s => s.DOM)
      .debug("DOM")
      .flatten(),
    state: sinks$.map(s => s.state).flatten()
  };
}

export default isolate(GameView, {
  state: {
    get: state => ({
      ...state,
      currentView: whichProgression(state)
    }),
    set: (_, state) => omit(state, ["currentView"])
  }
});
