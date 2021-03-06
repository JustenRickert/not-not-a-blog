import assert from "assert";
import {
  INDUSTRIES_UPDATE_SUPPLY_RATE,
  INDUSTRY_KEYS,
  INITIAL_POPULATION
} from "../constant";
import { update } from "../util";
import { growthAfterTime } from "./util";

export const updateUserSinceLastActive = user => {
  const now = new Date();
  const points =
    user.points + (now.getTime() - user.lastSaveDate.getTime()) / 1000;
  const population = growthAfterTime(
    user.population,
    (now.getTime() - user.lastSaveDate.getTime()) / 1000,
    INITIAL_POPULATION + user.points / 100
  );
  return {
    ...user,
    lastSaveDate: now,
    points,
    population
  };
};

export const industrySupplyChange = (industries, industryName) => {
  if (!industries[industryName].allocation) return industries;

  const rate = INDUSTRIES_UPDATE_SUPPLY_RATE[industryName];
  if (typeof rate === "number") {
    // simple update
    return update(industries, [industryName], industry => {
      const now = new Date();
      const secondsDiff =
        (now.getTime() - industry.lastUpdateSupplyDate.getTime()) / 1000;
      return {
        ...industry,
        lastUpdateSupplyDate: now,
        supply: industry.supply + industry.allocation * rate * secondsDiff
      };
    });
  } else {
    // complex update
    const industry = industries[industryName];
    const { unit, ...productCosts } = rate;
    const now = new Date();
    const secondsDiff =
      (now.getTime() - industry.lastUpdateSupplyDate.getTime()) / 1000;
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
          ? Math.min(deltaRatio, otherIndustry.supply / supplySubtraction)
          : deltaRatio;
      },
      1
    );
    return {
      ...industries,
      [industryName]: {
        ...industry,
        lastUpdateSupplyDate: now,
        supply: industry.supply + deltaRatio * maxDelta
      },
      ...Object.entries(maxSubtractions).reduce(
        (otherIndustries, [otherIndustryName, maxSubtraction], i) => {
          /**
           * Need to do the `Math.max` thing here because otherwise we get
           * rounding errors on the `deltaRatio` calculation that causes
           * negative supplies. JavaScript :shrug:
           */
          const otherIndustry = industries[otherIndustryName];
          const adjustedNewSupply = Math.max(
            0,
            otherIndustry.supply - deltaRatio * maxSubtraction
          );
          // TODO this logic may have to be revisited :/ It's kind of stupid
          // hard to deal with... I think it's working correctly though :)
          if (otherIndustry.supply - deltaRatio * maxSubtraction < 0) {
            console.log("ADJUSTMENT MADE", {
              industryName,
              otherIndustryName,
              calculated: otherIndustry.supply - deltaRatio * maxSubtraction
            });
          }
          return {
            ...otherIndustries,
            [otherIndustryName]: {
              ...otherIndustry,
              // NOTE: `lastUpdateSupplyDate` should NOT change here
              supply: adjustedNewSupply
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
