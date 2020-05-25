import xs from "xstream";

import { update } from "../../util";
import roughlyPeriodic from "../roughly-periodic";
import { INDUSTRIES } from "../constant";

function industryPointMultiplier(industryKey, industry) {
  const { productionMultiplier = {} } = INDUSTRIES[industryKey];
  if (!productionMultiplier.points) return 1;
  const { stock } = industry;
  const multiplier = productionMultiplier.points;
  return multiplier ** stock;
}

export function pointDelta(state) {
  return Object.keys(INDUSTRIES).reduce(
    (delta, key) => delta * industryPointMultiplier(key, state.industry[key]),
    1
  );
}

export default function points(sources) {
  const update$ = roughlyPeriodic(sources.time.createOperator, 1e3).mapTo(
    state => update(state, "points", points => points + pointDelta(state))
  );
  return xs.merge(update$);
}
