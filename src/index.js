import { run } from "@cycle/run";
import xs from "xstream";
import debounce from "xstream/extra/debounce";
import { div, button, h1, h4, a, makeDOMDriver } from "@cycle/dom";
import { makeHTTPDriver } from "@cycle/http";

import { set } from "../util";
import { INDUSTRY_KEYS, INDUSTRIES_STUB } from "../constant";
import { makeWebSocketDriver } from "./web-socket-driver";

const tap = (ex, x) => (console.log(ex, x), x);

function main(sources) {
  const click$ = xs.merge(
    ...INDUSTRY_KEYS.map(key =>
      sources.DOM.select(`.industry .${key} button`).events("click")
    )
  );

  click$.addListener({
    next: click => console.log(click)
  });

  const userReducer$ = sources.Socket.filter(p => p.type === "USER").map(
    ({ payload }) => state => set(state, "user", payload)
  );

  const industriesReducer$ = sources.Socket.filter(
    p => p.type === "INDUSTRY"
  ).map(({ payload: { industryName, industry } }) => state =>
    set(state, ["industries", industryName], industry)
  );

  const state$ = xs
    .merge(userReducer$, industriesReducer$)
    .fold((acc, reducer) => reducer(acc), {
      user: { points: "...", population: "...", lastSaveDate: "..." },
      industries: INDUSTRIES_STUB
    });

  const vdom$ = state$.map(
    ({ user: { points, population, lastSaveDate }, industries }) =>
      div(".container", [
        div(".user", [
          div(".date", ["last save: ", lastSaveDate]),
          div(".points", ("points", points)),
          div(".population", ("population", population))
        ]),
        div(
          ".industry",
          INDUSTRY_KEYS.map(key =>
            div(`.${key}`, [
              key,
              " ",
              industries[key].allocation,
              button(".up", "up"),
              button(".down", "down")
            ])
          )
        )
      ])
  );

  return { DOM: vdom$ };
}

run(main, {
  DOM: makeDOMDriver("#root"),
  Socket: makeWebSocketDriver()
});

if (module.hot) {
  module.hot.accept();
}
