import { INDUSTRY_KEYS, INDUSTRIES_UNLOCK_CONDITION } from "../constant";
import { withRandomOffset, update, setAll } from "../util";

// TODO move this?
const employmentPercentage = 0.025;
const layoffPercentage = 0.08;

const totalUnallocated = state => {
  const {
    user: { population },
    industries
  } = state;
  const allocated = INDUSTRY_KEYS.reduce(
    (allocated, key) => allocated + industries[key].allocation,
    0
  );
  return population - allocated;
};

export const industryActionReducer = action => state => {
  const now = new Date();
  switch (action.type.replace(/INDUSTRY#/, "")) {
    case "EMPLOY": {
      const {
        payload: { industryName }
      } = action;
      const unallocated = totalUnallocated(state);
      return update(state, ["industries", industryName], industry => ({
        ...industry,
        lastEmployDate: now,
        allocation:
          industry.allocation +
          withRandomOffset(employmentPercentage, 0.3) * unallocated
      }));
    }
    case "LAYOFF": {
      const {
        payload: { industryName }
      } = action;
      return update(state, ["industries", industryName], industry => ({
        ...industry,
        lastLayoffDate: now,
        allocation:
          industry.allocation * (1 - withRandomOffset(layoffPercentage, 0.3))
      }));
    }
    default:
      console.error("NOT HANDLED", action);
      return state;
  }
};

export const industriesUnlockReducer = () => state => {
  const newlyUnlocked = Object.entries(INDUSTRIES_UNLOCK_CONDITION)
    .filter(
      ([industryName, predicate]) =>
        !state.industries[industryName].unlocked && predicate(state)
    )
    .map(([industryName]) => industryName);
  return setAll(
    state,
    newlyUnlocked.map(industryName => [
      ["industries", industryName, "unlocked"],
      true
    ])
  );
};
