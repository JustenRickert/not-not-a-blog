import xs from "xstream";
import { div } from "@cycle/dom";

import { assert } from "../../../util";

const wartimeCondition = state =>
  state.industry.handTool.stock >= 10 && state.industry.arms.stock >= 1;

const chapterInformation = {
  introduction: {
    label: "Introduction",
    condition: () => true,
    import: () =>
      import(/* webpackChunkName: 'introduction' */
      "./md/introduction.md")
  },
  "next-steps": {
    label: "Next Steps",
    condition: state => Boolean(state.userInformation),
    options: state => ({
      planetName: state.userInformation.planet
    }),
    import: () =>
      import(/* webpackChunkName: 'new-aliens' */
      "./md/next-steps.md")
  },
  "new-aliens": {
    label: "New Aliens",
    condition: state => state.userInformation?.newAlienHero,
    options: state => ({
      newAlienHero: state.userInformation.newAlienHero,
      planetName: state.userInformation.planet
    }),
    import: () =>
      import(/* webpackChunkName: 'new-aliens' */
      "./md/new-aliens.md")
  },
  "working-aliens": {
    label: "Working Aliens",
    condition: state => state.industry.metal.stock >= 3,
    import: () =>
      import(/* webpackChunkName: 'working-aliens' */
      "./md/working-aliens.md")
  },
  wartime: {
    label: "Wartime",
    condition: wartimeCondition,
    import: () =>
      import(/* webpackChunkName: 'wartime' */
      "./md/wartime.md")
  },
  entertainment: {
    label: "Entertainment",
    condition: state =>
      wartimeCondition(state) && state.industry.paper.stock >= 2,
    options: state => ({
      newAlienHero: state.userInformation.newAlienHero,
      planetName: state.userInformation.planet
    }),
    import: () =>
      import(/* webpackChunkName: 'entertainment' */
      "./md/entertainment.md")
  },
  bolshevists: {
    label: "Bolshevists",
    condition: state => state.industry.metal.stock >= 10,
    options: state => ({
      newAlienHero: state.userInformation.newAlienHero,
      planetName: state.userInformation.planet
    }),
    import: () =>
      import(/* webpackChunkName: 'bolshevists' */
      "./md/bolshevists.md")
  },
  measuringEquipment: {
    label: "Measuring",
    condition: state => false,
    import: () =>
      import(/* webpackChunkName: 'measuring' */
      "./md/measuring.md")
  },
  guns: {
    label: "Get The Gun",
    condition: state => false,
    options: _ => ({
      transcluded: "hella"
    }),
    import: () =>
      import(/* webpackChunkName: 'guns' */
      "./md/guns.md")
  },
  agitation: {
    label: "Agitation",
    condition: state => false, // TODO
    import: () =>
      import(/* webpackChunkName: 'agitation' */
      "./md/agitation.md")
  },
  "anthropogenic-fire": {
    label: "Fire",
    condition: state => false,
    import: () =>
      import(/* webpackChunkName: 'anthropogenic-fire' */
      "./md/anthropogenic-fire.md")
  }
};

export const chapters = Object.entries(chapterInformation).map(
  ([id, { label, condition }]) => ({
    id,
    label,
    condition
  })
);

export function makeTextView(id, state) {
  const text = chapterInformation[id];
  assert(text, "bad `id`", id);
  return xs
    .fromPromise(
      text
        .import()
        .then(m => m.default)
        .then(im => (typeof im === "function" ? im(text.options(state)) : im))
        .then(innerHTML => div(".chapter-content", { props: { innerHTML } }))
    )
    .startWith(div("loading"));
}
