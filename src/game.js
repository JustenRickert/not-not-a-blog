import xs from "xstream";
import isolate from "@cycle/isolate";

import { ofWhich } from "../util";
import makeUpdateReducer from "./game-update";
import { loading } from "./shared";

import "./game.css";

/**
 * Used for like game progression I guess. Like if there's something that like
 * necessarily needs to be dealt with it should go here.
 */
const switchComponent = ofWhich(
  [
    "user-information-entry",
    () =>
      import(/* webpackChunkName: 'user-information-entry' */
      "./game-views/user-information-entry")
  ],
  [
    "game",
    () =>
      import(/* webpackChunkName: 'game-view-game' */
      "./game-views/game")
  ]
);

function GameViewSwitch(sources) {
  const viewSinks$ = sources.state.stream
    .filter(state => state.currentPanel === "game") // NOTE: Maybe not ideal? Delays request of switchComponent, which is necessary because DOM.select apparently doesn't work on unmounted components
    .map(state => state.currentGameView)
    .map(switchComponent)
    .map(xs.fromPromise)
    .flatten()
    .map(m => m.default)
    .map(View => View(sources));

  const dom$ = viewSinks$
    .map(sinks => sinks.DOM)
    .flatten()
    .startWith(loading);

  const reducer$ = xs.merge(
    viewSinks$.map(sinks => sinks.state).flatten(),
    makeUpdateReducer(sources)
  );

  return {
    DOM: dom$,
    state: reducer$
  };
}

export default isolate(GameViewSwitch, { state: null });
