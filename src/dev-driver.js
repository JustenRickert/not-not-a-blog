import { adapt } from "@cycle/run/lib/adapt";
import xs from "xstream";

import { assert, get, set, setAll } from "../util";

export default function devDriver() {
  const incoming$ = xs.create({
    start(listener) {
      window.dev = {
        restart() {
          localStorage.removeItem("state");
          localStorage.removeItem("route");
          location.reload();
        }
      };
    },
    stop() {
      delete window.dev;
    }
  });

  return adapt(incoming$);
}
