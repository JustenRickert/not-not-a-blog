import xs from "xstream";
import isolate from "@cycle/isolate";
import dropRepeats from "xstream/extra/dropRepeats";
import { button, div, nav, sup } from "@cycle/dom";

import { updateAll } from "../util";
import { tabButtons } from "./shared";
import { makeTextView, chapters } from "./text";
import { loading } from "./shared";

function Story(sources) {
  const currentChapter$ = sources.state.stream.map(
    state => state.currentChapter
  );

  const storyTabsSwitch$ = sources.state.stream.map(state =>
    tabButtons(
      chapters
        .filter(c => c.condition(state))
        .map(({ id, label }) => ({
          id,
          label: [label, !state.viewedChapters.includes(id) ? sup("new") : null]
        }))
    )
  );

  const storyTabs$ = xs
    .combine(storyTabsSwitch$, currentChapter$)
    .map(([storyTabsSwitch, currentChapter]) =>
      storyTabsSwitch(currentChapter)
    );

  const chapter$ = currentChapter$
    .compose(dropRepeats())
    .map(makeTextView)
    .flatten();

  const dom$ = xs
    .combine(chapter$, storyTabs$)
    .map(([chapter, storyTabs]) =>
      div(".story", [
        nav(".tabs.table-of-contents", storyTabs),
        div(".chapter", [
          chapter,
          chapter !== loading
            ? div(".scroll-to-top-container", button("Back to top"))
            : null
        ])
      ])
    );

  const scrollToTopAction$ = sources.DOM.select(
    ".scroll-to-top-container button"
  ).events("click");

  scrollToTopAction$.addListener({
    next: () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    }
  });

  const storyAction$ = sources.DOM.select(".story .table-of-contents button")
    .events("click")
    .map(e => ({
      id: e.currentTarget.dataset.id
    }));

  const reducer$ = xs.merge(
    storyAction$.map(a => state =>
      updateAll(state, [
        ["currentChapter", () => a.id],
        [
          "viewedChapters",
          chapters =>
            chapters.includes(a.id) ? chapters : chapters.concat(a.id)
        ]
      ])
    )
  );

  return {
    DOM: dom$,
    state: reducer$
  };
}

export default isolate(Story, { state: null });
