import xs from "xstream";
import { div, section } from "@cycle/dom";

import Story from "./game-views/story";
import IndustryGrid from "./game-views/industry-grid";

import "./game-view.css";

export default function Beginning(sources) {
  const storySinks = Story(sources);
  const industryGridSinks = IndustryGrid(sources);

  const dom$ = xs
    .combine(industryGridSinks.DOM, storySinks.DOM)
    .map(([industryGrid, story]) => {
      return div(".beginning", [
        industryGrid,
        // TODO: implement
        section(".upgrade-grid", []),
        story
      ]);
    });

  const reducer$ = xs.merge(industryGridSinks.state);

  return {
    DOM: dom$,
    state: reducer$
  };
}
