import xs from "xstream";
import { div } from "@cycle/dom";

import { makeTextView } from "./story-text";

function Story(sources) {
  const chapter$ = sources.route.stream
    .map(route => makeTextView(route.story))
    .flatten();

  const dom$ = xs
    .combine(sources.state.stream, chapter$)
    .map(([state, chapter]) => div([state.points, chapter]));

  return {
    dom: dom$
  };
}

export default Story;
