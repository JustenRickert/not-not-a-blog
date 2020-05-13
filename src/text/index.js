import xs from "xstream";
import { div } from "@cycle/dom";

import { assert, range } from "../../util";

import "./text.css";
import "./loading.css";

const chapterInformation = {
  introduction: {
    label: "Introduction",
    condition: () => true,
    import: () => import("./introduction.md")
  },
  "next-steps": {
    label: "Next Steps",
    condition: state => state.userInformation,
    import: () => import("./next-steps.md")
  }
};

export const chapters = Object.entries(chapterInformation).map(
  ([id, { label, condition }]) => ({
    id,
    label,
    condition
  })
);

const loading = div(".loading", range(4).map(() => div(["."])));

export function makeTextView(id) {
  const text = chapterInformation[id];
  assert(text, "bad `id`", id);
  return (
    xs
      .fromPromise(
        text
          .import()
          .then(m => m.default)
          // TODO style .message?
          .then(innerHTML => div(".chapter", { props: { innerHTML } }))
      )
      // TODO: Do we like this? Probably not... :shrug:
      .startWith(loading)
  );
}

// export default function makeText(id) {
//   const text = record[id];
//   assert(text, "bad `id`", id);
//   return xs
//     .fromPromise(text.import())
//     .map(m => m.default)
//     .debug("tetx")
//     .map(content => ({
//       label: text.label,
//       content
//     }));
// }
