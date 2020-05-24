import xs from "xstream";
// import sampleCombine from "xstream/extra/sampleCombine";
import dropRepeats from "xstream/extra/dropRepeats";
import { button, div, h2, label, span } from "@cycle/dom";

import { cases, set, setAll } from "../../util";
import { chapters, makeTextView } from "./story-text";

import "./story.css";

function TableOfContents(sources) {
  const dom$ = sources.state.stream.map(state =>
    div([
      h2("Table of Contents"),
      div(
        chapters.map((c, index) =>
          c.condition(state)
            ? button(
                ".chapter",
                {
                  dataset: { id: c.id, index }
                },
                [label(c.label), span(".index", index)]
              )
            : null
        )
      )
    ])
  );

  const clickAction$ = sources.dom
    .select(".chapter")
    .events("click")
    .map(e => e.ownerTarget.dataset)
    .map(({ id, index = "0" }) => ({
      id,
      index: Number(index)
    }));
  const reducer$ = clickAction$.map(chapter => route =>
    setAll(route, [["story.chapter", chapter], ["story.section", "chapter"]])
  );

  return {
    dom: dom$,
    route: reducer$
  };
}

function Chapter(sources) {
  const chapter$ = xs
    .combine(sources.route.stream, sources.state.stream)
    .compose(dropRepeats(([r1], [r2]) => r1 === r2))
    .map(([route, state]) => makeTextView(route.story.chapter.id, state))
    .flatten();

  // TODO this should work but like doesn't?!?! Is a little bit cleaner but
  // that's all I guess
  // const chapter$ = sources.route.stream
  //   .compose(sampleCombine(sources.state.stream))
  //   .map(([route, state]) => makeTextView(route.story.chapter.id, state))
  //   .flatten();

  const dom$ = xs
    .combine(sources.route.stream, sources.state.stream, chapter$)
    .map(([route, state, chapterDom]) => {
      const {
        story: {
          chapter: { index }
        }
      } = route;
      const previousChapter = chapters[index - 1];
      const nextChapter = chapters[index + 1];
      return div([
        div(".table-of-contents", button("Table of Contents")),
        h2(["Chapter ", index]),
        chapterDom,
        div([
          previousChapter && previousChapter.condition(state)
            ? button(
                ".pagination",
                { dataset: { index: index - 1 } },
                "Previous"
              )
            : div(),
          nextChapter && nextChapter.condition(state)
            ? button(".pagination", { dataset: { index: index + 1 } }, "Next")
            : div()
        ])
      ]);
    });

  return {
    dom: dom$,
    route: xs.merge(
      sources.dom
        .select("button.pagination")
        .events("click")
        .map(e => e.ownerTarget.dataset)
        .map(({ index = "0" }) => ({ index: Number(index) }))
        .map(({ index }) => route =>
          set(route, "story.chapter", {
            index,
            id: chapters[index].id
          })
        ),
      sources.dom
        .select(".table-of-contents button")
        .events("click")
        .mapTo(route => set(route, "story.section", "table-of-contents"))
    )
  };
}

const storySwitchView = cases(
  ["table-of-contents", TableOfContents],
  ["chapter", Chapter]
);

function Story(sources) {
  const view$ = sources.route.stream
    .map(route => route.story.section)
    .map(storySwitchView)
    .map(View => View(sources));

  const dom$ = view$.map(v => v.dom).flatten();

  return {
    dom: dom$,
    route: view$.map(v => v.route || xs.empty()).flatten()
  };
}

export default Story;
