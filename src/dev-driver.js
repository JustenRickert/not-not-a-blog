import { adapt } from "@cycle/run/lib/adapt";
import xs from "xstream";

import { assert, set, setAll } from "../util";
import { UPGRADES, INIT_STATE } from "./constant";

export default function devDriver() {
  const incoming$ = xs.create({
    start(listener) {
      window.dev = {
        upgrade(upgradeName) {
          assert(upgradeName in UPGRADES, "`upgrade` name is bad");
          listener.next({
            type: "reducer",
            reducer: state =>
              setAll(state, [
                [["upgrades", upgradeName, "unlocked"], true],
                [["upgrades", upgradeName, "unlockDate"], new Date(Infinity)]
              ])
          });
        },
        resetProgress() {
          listener.next({
            type: "reducer",
            reducer: state =>
              setAll(state, [
                ["population", INIT_STATE.population],
                ["resources", INIT_STATE.resources],
                ["upgrades", INIT_STATE.upgrades]
              ])
          });
        },
        set(key, value) {
          listener.next({
            type: "reducer",
            reducer: state => set(state, key, value)
          });
        }
      };
    },
    stop() {
      delete window.dev;
    }
  });

  return adapt(incoming$);
}
