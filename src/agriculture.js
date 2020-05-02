import xs from "xstream";
import { div, button, h1, h2, h3, h4, a, ul, li, span } from "@cycle/dom";

const makeEmploymentAction = (sources, industryName) => {
  const employmentClick$ = xs.merge(
    sources.DOM.select(`.${industryName} .employ`)
      .events("click")
      .mapTo({
        type: "employment",
        reason: "employ",
        payload: { industryName }
      }),
    sources.DOM.select(`.${industryName} .layoff`)
      .events("click")
      .mapTo({
        type: "employment",
        reason: "layoff",
        payload: { industryName }
      })
  );
  return xs.merge(employmentClick$);
};

function intent(sources) {
  const employmentAction$ = makeEmploymentAction(sources, "agriculture");
  return xs.merge(employmentAction$);
}

export default function Agriculture(sources) {
  const action$ = intent(sources);

  const agriculture$ = sources.state.stream.map(
    state => state.industries.agriculture
  );

  const dom$ = agriculture$.map(({ supply, employed }) =>
    div(".agriculture", [
      h3("Agriculture"),
      ul([li(["supply", " ", supply]), li(["employed", " ", employed])]),
      button(".employ", "employ"),
      button(".layoff", "layoff")
    ])
  );

  return {
    DOM: dom$,
    action: action$
    // state: reducer$
  };
}
