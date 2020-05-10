import xs from "xstream";

import {
  assert,
  set,
  setAll,
  sum,
  partition,
  update,
  updateAll
} from "../../util";
import { TIMEOUTS, LEAST_POPULATION } from "../constant";

export default function makeUserUpdateReducer() {
  const pointsReducer$ = xs.periodic(1e3 * TIMEOUTS.points).mapTo(state => {
    const {
      user: { lastPointsUpdate },
      derived: { derivative }
    } = state;
    const now = Date.now();
    const since = (now - lastPointsUpdate) / 1000;
    return updateAll(state, [
      ["user.points", points => points + since * derivative.user.points],
      ["user.lastPointsUpdate", () => now]
    ]);
  });

  /*
   * Industries to not layoff when there's population collapse... TODO: Keep an
   * eye on this because as things become more complicated in the future so
   * might this function... They unsafe in the sense that losing them would mean
   * that more people would die, not that the industry itself is inherently
   * unsafe.
   */
  const safeIndustryNames = ["agriculture", "foodService"];

  const populationReducer$ = xs
    .periodic(1e3 * TIMEOUTS.population)
    .mapTo(state => {
      const {
        user: { population },
        industries,
        derived: { employed, unemployed, derivative }
      } = state;
      const delta = TIMEOUTS.population * derivative.user.population;
      if (delta < 0) {
        const newPopulation = Math.max(LEAST_POPULATION, population + delta);
        const populationLost = population - newPopulation;
        // lose the unemployed first to prevent collapse...
        // It's like Vlad the Impaler-esque :)
        const unemployedLost = Math.min(unemployed, populationLost);
        const employedLost = populationLost - unemployedLost;
        const industryEntries = Object.entries(industries);
        const [unsafeIndustries, safeIndustries] = partition(
          industryEntries,
          ([industryName]) => !safeIndustryNames.includes(industryName)
        );
        const safeLosses = sum(
          safeIndustries,
          ([, industry]) => (industry.employed / employed) * employedLost
        );
        return setAll(state, [
          ["user.population", population - unemployedLost - employedLost],
          // TODO should safe industries be allowed to lose employees? :/
          ...unsafeIndustries.map(([industryName, industry]) => {
            const lost = employedLost * (industry.employed / employed);
            const lossTransferredFromSafeIndustries = employedLost
              ? (safeLosses * lost) / (employedLost - safeLosses)
              : 0;
            assert(
              !isNaN(lossTransferredFromSafeIndustries),
              "unsafe losses component needs to be a number",
              {
                lost,
                safeLosses,
                employedLost,
                lossTransferredFromSafeIndustries
              }
            );
            return [
              ["industries", industryName, "employed"],
              Math.max(
                0,
                industry.employed - lost - lossTransferredFromSafeIndustries
              )
            ];
          })
        ]);
      } else {
        assert(
          derivative.user.multiplier.population >= 1 &&
            isFinite(derivative.user.multiplier.population),
          "user population delta multiplier should be positive finite",
          derivative
        );
        return set(
          state,
          "user.population",
          state.user.population + delta * derivative.user.multiplier.population
        );
      }
    });

  const foodReducer$ = xs.periodic(1e3 * TIMEOUTS.food).mapTo(state => {
    const delta = TIMEOUTS.food * state.derived.derivative.user.food;
    return update(state, "user.food", food => Math.max(0, food + delta));
  });

  return xs.merge(pointsReducer$, populationReducer$, foodReducer$);
}
