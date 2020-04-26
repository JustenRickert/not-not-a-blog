import { div, button, h1, h4, a, makeDOMDriver } from "@cycle/dom";

export default function industry(sources) {
  const industry$ = sources.Socket.filter(p => p.type === "INDUSTRY")
    .map(v => v.payload)
    .debug("industry");
  return div("hella");
}
