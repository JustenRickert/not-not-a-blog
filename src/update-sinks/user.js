import xs from "xstream";
import sampleCombine from "xstream/extra/sampleCombine";
import delay from "xstream/extra/delay";

import { assert, set, update, updateAll } from "../../util";
import { TIMEOUTS } from "../constant";

/*
 * Industries to not layoff when there's population collapse... TODO: Keep an
 * eye on this because as things become more complicated in the future so
 * might this function... They unsafe in the sense that losing them would mean
 * that more people would die, not that the industry itself is inherently
 * unsafe.
 */
// const safeIndustryNames = ["agriculture", "foodService", "education"];

/**
 * TODO? It is too difficult to compute lost population without sacrificing the
 * fun of the game. So I'mma figure up a completely different mechanic!
 */
// const lostPopulationReducer = () => {
//   const newPopulation = Math.max(LEAST_POPULATION, population + delta);
//   const populationLost = population - newPopulation;
//   // lose the unemployed first to prevent collapse...
//   // It's like Vlad the Impaler-esque :)
//   const unemployedLost = Math.min(unemployed, populationLost);
//   const employedLost = populationLost - unemployedLost;
//   const industryEntries = Object.entries(industries);
//   const [unsafeIndustries, safeIndustries] = partition(
//     industryEntries,
//     ([industryName]) => !safeIndustryNames.includes(industryName)
//   );
//   const safeLosses = sum(
//     safeIndustries,
//     ([, industry]) => (industry.employed / employed) * employedLost
//   );
//   return setAll(state, [
//     ["user.population", population - unemployedLost - employedLost],
//     // TODO should safe industries be allowed to lose employees? :/
//     ...unsafeIndustries.map(([industryName, industry]) => {
//       const lost = employedLost * (industry.employed / employed);
//       const lossTransferredFromSafeIndustries = employedLost
//         ? (safeLosses * lost) / (employedLost - safeLosses)
//         : 0;
//       assert(
//         !isNaN(lossTransferredFromSafeIndustries),
//         "unsafe losses component needs to be a number",
//         {
//           lost,
//           safeLosses,
//           employedLost,
//           lossTransferredFromSafeIndustries
//         }
//       );
//       return [
//         ["industries", industryName, "employed"],
//         Math.max(
//           0,
//           industry.employed - lost - lossTransferredFromSafeIndustries
//         )
//       ];
//     })
//   ]);
// };

export default function makeUserUpdateReducer(sources) {
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

  const populationTimeout = 1e3 * TIMEOUTS.population;
  const populationDelayTime = 30 * TIMEOUTS.population;
  assert(
    populationDelayTime < populationTimeout,
    "`populationTimeout` has to be less than the `populationDelayTime`",
    { populationDelayTime, populationTimeout }
  );
  const populationReducer$ = xs
    .periodic(populationTimeout)
    .compose(sampleCombine(sources.state.stream))
    .map(([, state]) => {
      const {
        derived: { derivative }
      } = state;
      const delta = TIMEOUTS.population * derivative.user.population;
      return delta < 0
        ? xs.of(delta).compose(delay(populationDelayTime))
        : xs.of(delta);
    })
    // NOTE: Maybe not straight-forward: As long as the `populationDelayTime` is
    // greater than the `populationTimeout`, cases where `delta < 0` won't
    // happen.
    .flatten()
    .map(delta => state => {
      assert(delta >= 0 && isFinite(delta), "`delta` needs to be positive");
      const {
        derived: { derivative }
      } = state;
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
    });

  const foodReducer$ = xs.periodic(1e3 * TIMEOUTS.food).mapTo(state => {
    const delta = TIMEOUTS.food * state.derived.derivative.user.food;
    return update(state, "user.food", food => Math.max(0, food + delta));
  });

  return xs.merge(pointsReducer$, populationReducer$, foodReducer$);
}
