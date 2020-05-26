import { adapt } from "@cycle/run/lib/adapt";
import xs from "xstream";

import { set, update } from "../util";
import { randomNewMarket } from "./model/market";

export default function devDriver() {
  const incoming$ = xs.create({
    start(listener) {
      window.dev = {
        randomMarket() {
          listener.next({
            type: "reducer",
            reducer: randomNewMarket
          });
        },
        set(kp, x) {
          listener.next({
            type: "reducer",
            reducer: state => set(state, kp, x)
          });
        },
        update(kp, fn) {
          listener.next({
            type: "reducer",
            reducer: state => update(state, kp, fn)
          });
        },
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
