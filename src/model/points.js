import xs from "xstream";

import { product, update, withRandomOffset } from "../../util";
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
  return product(Object.keys(INDUSTRIES), key =>
    industryPointMultiplier(key, state.industry[key])
  );
}

export default function points(_sources) {
  const update$ = roughlyPeriodic(1e3).map(since => state =>
    update(
      state,
      "points",
      points => points + withRandomOffset(since / 1e3, 0.25) * pointDelta(state)
    )
  );
  return xs.merge(update$);
}
