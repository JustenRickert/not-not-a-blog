import xs from "xstream";
import isolate from "@cycle/isolate";
import dropRepeats from "xstream/extra/dropRepeats";

import { ofWhich } from "../util";
import makeUpdateReducer from "./game-update";
import makeEnterpriseReducer from "./game-views/enterprise-update";
import { loading } from "./shared";

import "./game.css";

/**
 * `currentGameView` routing
 *
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
  const sinks$ = sources.state.stream
    .compose(
      dropRepeats((s1, s2) =>
        ["currentPanel", "currentGameView"].every(k => s1[k] === s2[k])
      )
    )
    .map(state => state.currentGameView)
    .map(switchComponent)
    .map(xs.fromPromise)
    .flatten()
    .map(m => m.default)
    .map(View => View(sources));

  const dom$ = sinks$
    .map(sinks => sinks.DOM)
    .flatten()
    .startWith(loading);

  const reducer$ = xs.merge(
    sinks$.map(sinks => sinks.state).flatten(),
    makeEnterpriseReducer(sources),
    makeUpdateReducer(sources)
  );

  return {
    DOM: dom$,
    state: reducer$
  };
}

export default isolate(GameViewSwitch, { state: null });
