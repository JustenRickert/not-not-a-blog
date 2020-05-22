import xs from "xstream";

import roughlyPeriodic from "../roughly-periodic";
import { update } from "../../util";

export default function points(sources) {
  const update$ = roughlyPeriodic(sources.time.createOperator, 1e3).mapTo(
    state => update(state, "points", points => points + 1)
  );
  return xs.merge(update$);
}
