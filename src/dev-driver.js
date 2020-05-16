import { adapt } from "@cycle/run/lib/adapt";
import xs from "xstream";

import { assert, set, setAll } from "../util";
import { UPGRADES } from "./constant";

export default function devDriver() {
  const incoming$ = xs.create({
    start(listener) {
      window.dev = {
        upgrade(upgradeName) {
          assert(upgradeName in UPGRADES, "`upgrade` name is bad");
          listener.next({
            type: "upgrade",
            reducer: state =>
              setAll(state, [
                [["upgrades", upgradeName, "unlocked"], true],
                [["upgrades", upgradeName, "unlockDate"], new Date(Infinity)]
              ])
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
