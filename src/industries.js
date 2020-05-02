import xs from "xstream";
import { div, button, h1, h2, h3, h4, a, ul, li, span } from "@cycle/dom";

const makeIndustriesUpdateStream = sources => {
  // const
};

export default function Industries(sources) {
  const industries$ = sources.state.stream.map(state => state.industries);

  industries$.addListener({ next: console.log });

  const dom$ = industries$.map(industries =>
    div(
      Object.entries(industries)
        .filter(([, i]) => i.unlocked)
        .map(([industryName, { supply, employed }]) =>
          div([
            h3(industryName),
            ul([li(["supply", " ", supply]), li(["employed", " ", employed])])
          ])
        )
    )
  );

  const reducer$ = xs.merge();

  return {
    DOM: dom$,
    state: reducer$
  };
}
