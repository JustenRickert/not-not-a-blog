import xs from "xstream";
import { div } from "@cycle/dom";

import { assert } from "../../util";
import { loading } from "../shared";

import "./text.css";

const chapterInformation = {
  agitation: {
    label: "Agitation",
    condition: () => false, // TODO
    import: () =>
      import(/* webpackChunkName: 'agitation' */
      "./md/agitation.md")
  },
  "anthropogenic-fire": {
    label: "Anthropogenic Fire",
    condition: state => state.upgrades.pastoralism.unlocked,
    import: () =>
      import(/* webpackChunkName: 'anthropogenic-fire' */
      "./md/anthropogenic-fire.md")
  },
  bolshevists: {
    label: "Bolshevists",
    condition: state => state.resources.metals > 1000,
    import: () =>
      import(/* webpackChunkName: 'bolshevists' */
      "./md/bolshevists.md")
  },
  guns: {
    label: "Get your gun",
    condition: state => state.upgrades.guns.unlocked,
    import: () =>
      import(/* webpackChunkName: 'guns' */
      "./md/guns.md")
  },
  introduction: {
    label: "Introduction",
    condition: () => true,
    import: () =>
      import(/* webpackChunkName: 'introduction' */
      "./md/introduction.md")
  },
  measuringEquipment: {
    label: "Measuring",
    condition: state => state.upgrades.measuringEquipment.unlocked,
    import: () =>
      import(/* webpackChunkName: 'measuring-equipment' */
      "./md/measuring.md")
  },
  "new-aliens": {
    label: "New Aliens",
    condition: state => state.upgrades.string.unlocked,
    import: () =>
      import(/* webpackChunkName: 'new-aliens' */
      "./md/new-aliens.md")
  },
  "next-steps": {
    label: "Next Steps",
    condition: state => state.userInformation,
    import: () =>
      import(/* webpackChunkName: 'new-aliens' */
      "./md/next-steps.md")
  },
  wartime: {
    label: "Wartime",
    condition: state => state.upgrades.advancedHandTools.unlocked,
    import: () =>
      import(/* webpackChunkName: 'wartime' */
      "./md/wartime.md")
  },
  "working-aliens": {
    label: "Working Aliens",
    condition: state => state.upgrades.furnace.unlocked,
    import: () =>
      import(/* webpackChunkName: 'working-aliens' */
      "./md/working-aliens.md")
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
          .then(innerHTML => div(".chapter", { props: { innerHTML } }))
      )
      // TODO: Do we like this? Probably not... :shrug:
      .startWith(loading)
  );
}
