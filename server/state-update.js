import assert from "assert";
import { INDUSTRIES_UPDATE_SUPPLY_RATE, INDUSTRY_KEYS } from "../constant";
import { update } from "../util";
import { growthAfterTime } from "./util";

export const updateUserSinceLastActive = user => {
  const now = new Date();
  const points =
    user.points + (now.getTime() - user.lastSaveDate.getTime()) / 1000;
  const population = growthAfterTime(
    user.population,
    (now.getTime() - user.lastSaveDate.getTime()) / 1000,
    1000 + user.points / 100
  );
  return {
    ...user,
    lastSaveDate: now,
    points,
    population
  };
};

// TODO not working...
export const industrySupplyChange = (industries, key) => {
  const rate = INDUSTRIES_UPDATE_SUPPLY_RATE[key];
  if (typeof rate === "number") {
    // simple update
    return update(industries, [key], industry => {
      const now = new Date();
      const secondsDiff =
        1000 * (now.getTime() - industry.lastUpdateSupplyDate.getTime());
      return {
        ...industry,
        lastUpdateSupplyDate: now,
        supply: industry.supply + industry.allocation * rate * secondsDiff
      };
    });
  } else {
    // complex update
    const industry = industries[key];
    const { unit, ...productCosts } = rate;
    const now = new Date();
    const secondsDiff =
      1000 * (now.getTime() - industry.lastUpdateSupplyDate.getTime());
    const maxDelta = industry.allocation * unit * secondsDiff;
    const maxSubtractions = Object.entries(productCosts).reduce(
      (subtractions, [otherIndustryName, costPerUnit]) => ({
        ...subtractions,
        [otherIndustryName]: maxDelta * costPerUnit
      }),
      {}
    );
    const deltaRatio = Object.entries(maxSubtractions).reduce(
      (deltaRatio, [otherIndustryName, supplySubtraction]) => {
        const otherIndustry = industries[otherIndustryName];
        return otherIndustry.supply < supplySubtraction
          ? otherIndustry.supply / supplySubtraction
          : deltaRatio;
      },
      1
    );
    return {
      ...industries,
      [key]: {
        ...industry,
        lastUpdateSupplyDate: now,
        supply: industry.supply + deltaRatio * maxDelta
      },
      ...Object.entries(maxSubtractions).reduce(
        (otherIndustries, [otherIndustryName, maxSubtraction]) => {
          /**
           * Need to do the `Math.max` thing here because otherwise we get
           * rounding errors on the `deltaRatio` calculation that causes
           * negative supplies. JavaScript :shrug:
           */
          assert(
            industries[otherIndustryName].supply -
              deltaRatio * maxSubtraction >=
              0 || deltaRatio * maxSubtraction < 1,
            "Doing the below correction shouldn't affect numbers too irregularly"
          );
          return {
            ...otherIndustries,
            [otherIndustryName]: {
              ...industries[otherIndustryName],
              supply: Math.max(
                0,
                industries[otherIndustryName].supply -
                  deltaRatio * maxSubtraction
              )
            }
          };
        },
        {}
      )
    };
  }
};

export const updateIndustrySinceLastActive = industries =>
  INDUSTRY_KEYS.reduce(
    (industries, key) => industrySupplyChange(industries, key),
    industries
  );
