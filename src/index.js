import { run } from "@cycle/run";
import xs from "xstream";
import { div, button, h1, h4, a, makeDOMDriver } from "@cycle/dom";
import { makeHTTPDriver } from "@cycle/http";
import { makeWebSocketDriver } from "./web-socket-driver";

const tap = x => (console.log(x), x);

function main(sources) {
  const socketCount$ = sources.Socket.filter(p => p.type === "COUNT")
    .map(v => v.count)
    .startWith(0)
    .remember();
  const socketMessage$ = sources.Socket.filter(p => p.type === "inert")
    .map(v => v.message)
    .startWith("not hella")
    .remember();
  const vdom$ = xs
    .combine(socketCount$, socketMessage$)
    .map(([time, msg]) =>
      div(".container", [div(".time", time), div(".msg", msg)])
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
