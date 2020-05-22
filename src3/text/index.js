import xs from "xstream";
import { div } from "@cycle/dom";

import { assert } from "../../util";
import { loading } from "../shared";

import "./text.css";

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
    condition: state => state.userInformation,
    import: () =>
      import(/* webpackChunkName: 'new-aliens' */
      "./md/next-steps.md")
  },
  "new-aliens": {
    label: "New Aliens",
    condition: state => state.upgrades.string.unlocked,
    import: () =>
      import(/* webpackChunkName: 'new-aliens' */
      "./md/new-aliens.md")
  },
  "working-aliens": {
    label: "Working Aliens",
    condition: state => state.upgrades.furnace.unlocked,
    import: () =>
      import(/* webpackChunkName: 'working-aliens' */
      "./md/working-aliens.md")
  },
  wartime: {
    label: "Wartime",
    condition: state => state.upgrades.advancedHandTools.unlocked,
    import: () =>
      import(/* webpackChunkName: 'wartime' */
      "./md/wartime.md")
  },
  bolshevists: {
    label: "Bolshevists",
    // TODO maybe consider adding like a currency upgrade instead?
    condition: state => state.resources.metals > 1000,
    import: () =>
      import(/* webpackChunkName: 'bolshevists' */
      "./md/bolshevists.md")
  },
  measuringEquipment: {
    label: "Measuring",
    condition: state => state.upgrades.measuringEquipment.unlocked,
    import: () =>
      import(/* webpackChunkName: 'measuring' */
      "./md/measuring.md")
  },
  guns: {
    label: "Get The Gun",
    condition: state => state.upgrades.guns.unlocked,
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
    condition: state => state.upgrades.pastoralism.unlocked,
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

export function makeTextView(id) {
  const text = chapterInformation[id];
  assert(text, "bad `id`", id);
  return (
    xs
      .fromPromise(
        text
          .import()
          .then(m => m.default)
          .then(d => (typeof d === "function" ? d(text.options()) : d))
          .then(innerHTML => div(".chapter-content", { props: { innerHTML } }))
      )
      // TODO: Do we like this? Probably not... :shrug:
      .startWith(loading)
  );
}
