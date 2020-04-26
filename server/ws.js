import assert from "assert";
import express from "express";
import expressWs from "express-ws";
import xs from "xstream";
import sampleCombine from "xstream/extra/sampleCombine";

import {
  INDUSTRY_KEYS,
  INDUSTRY_SUPPLY_TIMEOUTS,
  INDUSTRIES_UPDATE_SUPPLY_RATE
} from "../constant";
import { set, update } from "../util";
import { userInformation, saveUser } from "./api/user";
import { getIndustries } from "./api/industry";
import { POPULATION_GROWTH_RATE } from "./constant";

/**
 * :shaka: https://en.wikipedia.org/wiki/Logistic_function#In_ecology:_modeling_population_growth
 */
const growthAfterTime = (
  original,
  secondsDiff,
  capacity,
  growthRate = POPULATION_GROWTH_RATE
) =>
  capacity /
  (1 +
    ((capacity - original) / original) * Math.E ** (-growthRate * secondsDiff));

// TODO move these to constants probably... maybe it's not important though
// :shrug:
const pointsTimeout = 5e3;
const populationTimeout = 30e3;
const lastSaveDateTimeout = 120e3;
const sendUserTimeout = 10e3;

const updateUserSinceLastActive = user => {
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

const industrySupplyChange = (industries, key) => {
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
        lastUpdateSupplyDate: new Date(),
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

const updateIndustrySinceLastActive = industries =>
  INDUSTRY_KEYS.reduce(
    (industries, key) => industrySupplyChange(industries, key),
    industries
  );

const periodicallySendToUser = ({ ws, db, userId }) => {
  const sendUserListener = {
    next: user => {
      ws.send(JSON.stringify({ type: "USER", payload: user }));
    }
  };

  const sendIndustriesListener = {
    next: ([industryName, industry]) => {
      ws.send(
        JSON.stringify({
          type: "INDUSTRY",
          payload: { industryName, industry }
        })
      );
    }
  };

  const sendSaveUserListener = {
    next: user => {
      saveUser(db, { userId, user });
    }
  };

  const tap = x => (console.log(x), x);

  Promise.all([
    userInformation(db, { userId }).then(updateUserSinceLastActive),
    getIndustries(db, { userId }).then(updateIndustrySinceLastActive)
  ])
    .then(([user, industries]) => {
      // TODO: Is there a better way to do this? Like `xs.periodic` that sends
      // immediately
      sendUserListener.next(user);
      sendSaveUserListener.next(user);

      const lastSaveDate$ = xs.periodic(lastSaveDateTimeout);
      const userPoints$ = xs.periodic(pointsTimeout);

      const userReducer$ = xs.merge(
        lastSaveDate$.map(() => state =>
          set(state, "user.lastSaveDate", new Date())
        ),
        userPoints$.map(() => state =>
          update(state, "user.points", points => points + 1e3 * pointsTimeout)
        ),
        xs
          .periodic(populationTimeout)
          .map(() => state =>
            update(state, "user.population", population =>
              growthAfterTime(
                population,
                1e3 * populationTimeout,
                1000 + state.user.points / 100
              )
            )
          )
      );

      const industryPeriods$ = xs.merge(
        ...INDUSTRY_KEYS.map(key =>
          xs.periodic([INDUSTRY_SUPPLY_TIMEOUTS[key]]).mapTo(key)
        )
      );

      const industriesReducer$ = industryPeriods$.map(key => state =>
        update(state, "industries", industries =>
          industrySupplyChange(industries, key)
        )
      );

      const state$ = xs
        .merge(userReducer$, industriesReducer$)
        .fold((acc, reducer) => reducer(acc), {
          industries,
          user
        });

      const sendUser$ = userPoints$
        .compose(sampleCombine(state$))
        .map(([, state]) => state.user);

      const saveUser$ = lastSaveDate$
        .compose(sampleCombine(state$))
        .map(([, state]) => state.user);

      const sendIndustries$ = industryPeriods$
        .compose(sampleCombine(state$))
        .map(([key, state]) => [key, state.industries[key]]);

      sendIndustries$.addListener(sendIndustriesListener);
      sendUser$.addListener(sendUserListener);
      saveUser$.addListener(sendSaveUserListener);

      ws.on("close", () => {
        sendUser$.removeListener(sendUserListener);
        saveUser$.removeListener(sendSaveUserListener);
      });
    })
    .catch(e => {
      console.error(e);
      throw e;
    });
};

export default db => {
  const wsRouter = expressWs(express.Router());
  const router = wsRouter.app;

  router.ws("/", (ws, req) => {
    ws.on("message", msg => {
      console.log("receieved message", msg);
    });

    periodicallySendToUser({ ws, db, userId: req.session.userId });
  });

  return router;
};
