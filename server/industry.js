import { INDUSTRY_KEYS } from "../constant";
import { withRandomOffset, update } from "../util";

// TODO move this?
const employmentPercentage = 0.025;

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
    case "EMPLOY":
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
    case "LAYOFF":
    // TODO implement similar to above^
    default:
      console.error("NOT HANDLED", action);
      return state;
  }
};
