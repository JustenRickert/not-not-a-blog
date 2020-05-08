import xs from "xstream";
import isolate from "@cycle/isolate";
import delay from "xstream/extra/delay";
import dropRepeats from "xstream/extra/dropRepeats";
import sampleCombine from "xstream/extra/sampleCombine";
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
import { which, cases, set, omit, update } from "../../util";
import { whole, perSecond } from "../format";
import { TRACTOR, DINNER_PLATE, ALIEN } from "../string";

export default function Introduction(sources) {
  const employmentAction$ = makeEmploymentClickAction(sources);

  const buttonAttrs$ = xs
    .merge(
      employmentAction$.mapTo(state => set(state, "disabled", true)),
      employmentAction$
        .mapTo(state => set(state, "disabled", false))
        .compose(delay(15e3))
    )
    .fold((state, reducer) => reducer(state), { disabled: false });

  const outbound$ = employmentAction$
    .compose(sampleCombine(sources.state.stream))
    .map(([, state]) => state.industries.foodService.employed > 3)
    .compose(delay(5e3))
    .fold((_, state) => state, false);

  const dom$ = xs
    .combine(sources.state.stream, buttonAttrs$, outbound$)
    .map(
      ([
        {
          user: { population },
          industries: { agriculture, foodService },
          derived: { derivative }
        },
        buttonAttrs,
        outbound
      ]) =>
        !outbound
          ? div([
              p("Alrighty."),
              p("Okey dokey."),
              p(["So. This is a numbers game.", " ", "..."]),
              p("What does that mean?"),
              p("..."),
              p("Umm. Well. Who cares?"),
              p([
                "Not that we have some ",
                TRACTOR,
                whole(agriculture.supply),
                ", let's make it into smoething"
              ]),
              p([
                "Click this button ",
                button(
                  ".employ",
                  {
                    attrs: buttonAttrs,
                    dataset: { industryName: "foodService" }
                  },
                  "Employ"
                ),
                " to ",
                i('"employ"'),
                " some ",
                DINNER_PLATE,
                whole(foodService.employed)
              ]),
              foodService.employed > 3
                ? p([
                    "Dope. Now we're cooking. Literally. Or, well, maybe literally. They're ",
                    i("aliens"),
                    " or whatever."
                  ])
                : null
            ])
          : div([
              p("Okay so it looks like we have the following now:"),
              ul([
                li([
                  ALIEN,
                  whole(population),
                  " repopulating at ",
                  perSecond(derivative.user.population)
                ]),
                li([
                  TRACTOR,
                  whole(agriculture.employed),
                  " creating biomass or whatever at ",
                  perSecond(derivative.agriculture.agriculture)
                ]),
                li([
                  DINNER_PLATE,
                  whole(foodService.employed),
                  " converting the ",
                  i("alien "),
                  " biomass or whatever at ",
                  perSecond(derivative.user.food + derivative.foodService.food),
                  ` (${TRACTOR}${perSecond(
                    derivative.foodService.agriculture
                  )})`
                ])
              ]),
              p([
                "I would guess that ",
                ALIEN,
                " probably need ",
                DINNER_PLATE,
                " ",
                `
to live and repopulate. So yeah. Numbers game. I'll put that same information
above. In future panes you can click the quick view for some further details too
if you want.
`
              ])
            ])
    );

  const reducer$ = xs.merge(
    outbound$
      .filter(Boolean)
      .mapTo(state => set(state, "progression.introduction", true))
      .compose(delay(20e3)),
    employmentAction$.map(employmentActionReducer)
  );

  return {
    DOM: dom$,
    state: reducer$
  };
}
