import roughlyPeriodic from "../roughly-periodic";

import { INDUSTRIES, STORY } from "../constant";
import { set } from "../../util";

export default function makeInit(sources) {
  const peroid$ = roughlyPeriodic(sources.time.createOperator, 60e3).mapTo(
    state => set
  );
}
