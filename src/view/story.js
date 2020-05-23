import xs from "xstream";
import { button, div } from "@cycle/dom";

import { cases, set, setAll } from "../../util";
import { chapters, makeTextView } from "./story-text";

const chapterTabs = chapters.map(c =>
  button(".chapter", { dataset: { id: c.id } }, c.id)
);

function TableOfContents(sources) {
  const dom$ = xs.of(div(chapterTabs));

  const clickAction$ = sources.dom
    .select("button.chapter")
    .events("click")
    .map(e => e.ownerTarget.dataset.id);

  const reducer$ = clickAction$.map(id => route =>
    setAll(route, [["story.chapter", id], ["story.section", "chapter"]])
  );

  return {
    dom: dom$,
    route: reducer$
  };
}

function Chapter(sources) {
  const dom$ = sources.route.stream
    .map(route => makeTextView(route.story.chapter))
    .flatten()
    .map(chapterDom =>
      div([button(".table-of-contents", "Table of Contents"), chapterDom])
    );

  return {
    dom: dom$,
    route: sources.dom
      .select("button.table-of-contents")
      .events("click")
      .mapTo(route => set(route, "story.section", "table-of-contents"))
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
