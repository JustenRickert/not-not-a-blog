import xs from "xstream";
import isolate from "@cycle/isolate";
import delay from "xstream/extra/delay";
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

import {
  makeEmploymentClickAction,
  employmentActionReducer
} from "../actions/employment";
import { which, cases, set, omit, thread } from "../../util";
import { whole, perSecond } from "../format";

export default function MakeFirstWorker(sources) {
  const employmentAction$ = makeEmploymentClickAction(sources);

  const sayNice$ = employmentAction$.mapTo(state =>
    set(state, "buttonClicked", true)
  );

  const saySomethingAboutTheNewWorkers$ = employmentAction$
    .compose(delay(2500))
    .mapTo(state => set(state, "showingNewWorkerInfo", true));

  const sayHowProceeding$ = employmentAction$
    .compose(delay(7500))
    .mapTo(state => set(state, "showingHowProceeding", true));

  const local$ = xs
    .merge(sayNice$, saySomethingAboutTheNewWorkers$, sayHowProceeding$)
    .fold((state, reducer) => reducer(state), {
      buttonClicked: null,
      showingNewWorkerInfo: null,
      showingHowProceeding: null
    });

  const dom$ = xs.combine(sources.state.stream, local$).map(([state, local]) =>
    div([
      p([
        `
Hey, what's up? This isn't my blog; but it's not
`,
        " ",
        i("not"),
        " kinda like a blog either."
      ]),
      p(
        `
Seems like you're new here, like you probably got no idea what you're doing.
`
      ),
      p(
        `
That's okay. This is an incremental game, that means numbers increment or
decrement. Like this one here: ${"🔺" + whole(state.user.points)}. That symbol
is me being lazy, basically. I wanted to add something to make it easier to
recognize what I was looking at a glance. It's just an emoji (a code point
U+1F53A that gets rendered to a symbol in a web browser). What follows the
symbol is what you want to make go up. Right now it's only going up by one, once
per second.
`
      ),
      p([
        `
There's also this alien number: ${"👽" + whole(state.user.population)}. Those
are your people—
`.trim(),
        i("umm, aliens"),
        `
—and they're not doing anything right now. We're going to call them
`.trim(),
        " ",
        i("unemployed"),
        `
, but only because I assume familiarity with that word—being in the
modern era of capitalism and all.
`.trim()
      ]),
      p([
        `
Anyway, click this button to make them start doing something:
`,
        button(
          ".employ",
          {
            attrs: { disabled: Boolean(local.buttonClicked) },
            dataset: { industryName: "agriculture" }
          },
          "Employ"
        ),
        "."
      ]),
      local.buttonClicked && p("Nice!"),
      local.showingNewWorkerInfo &&
        p([
          "Check these ",
          i("aliens"),
          " out!",
          "🚜" + whole(state.industries.agriculture.employed),
          " ",
          perSecond(state.derived.derivative.agriculture.agriculture),
          ". ",
          `
I think they're doing agricultural work. Collecting biomass, or something alien-like
`
        ]),
      local.showingHowProceeding &&
        p([
          `
Let's proceed and talk further about what's really going on here! :)
`
        ])
    ])
  );

  const reducer$ = xs.merge(
    employmentAction$.map(employmentActionReducer),
    employmentAction$
      .mapTo(state => set(state, "progression.makeFirstWorker", true))
      .compose(delay(12000))
  );

  return {
    DOM: dom$,
    state: reducer$
  };
}
