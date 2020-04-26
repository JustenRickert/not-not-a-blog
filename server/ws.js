import assert from "assert";
import express from "express";
import expressWs from "express-ws";
import xs from "xstream";
import throttle from "xstream/extra/throttle";
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

const updateIndustrySinceLastActive = industries =>
  INDUSTRY_KEYS.reduce(
    (industries, key) => industrySupplyChange(industries, key),
    industries
  );

const makeStateUpdateStreams = (
  { ws, db, userId },
  action$,
  { user, industries }
) => {
  const lastSaveDate$ = xs.periodic(lastSaveDateTimeout);
  const userPoints$ = xs.periodic(pointsTimeout);
  const userPopulation$ = xs.periodic(populationTimeout);

  const userUpdater$ = xs.merge(
    lastSaveDate$.map(() => state =>
      set(state, "user.lastSaveDate", new Date())
    ),
    userPoints$.map(() => state =>
      update(state, "user.points", points => points + pointsTimeout / 1e3)
    ),
    userPopulation$.map(() => state =>
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

  const industriesUpdater$ = industryPeriods$.map(key => state =>
    update(state, "industries", industries =>
      industrySupplyChange(industries, key)
    )
  );

  // TODO connect this
  const industriesReducer$ = action$
    .filter(a => a.type === "INDUSTRY" && "allocation" in a.payload)
    .map(action => state =>
      set(
        state,
        ["industries", action.industryName, "allocation"],
        action.allocation
      )
    );

  const state$ = xs
    .merge(userUpdater$, industriesUpdater$)
    .fold((acc, reducer) => reducer(acc), {
      industries,
      user
    });

  const sendUser$ = xs
    .merge(userPoints$, userPopulation$)
    .compose(throttle(Math.min(pointsTimeout, populationTimeout)))
    .compose(sampleCombine(state$))
    .map(([, state]) => state.user);

  const saveUser$ = lastSaveDate$
    .compose(sampleCombine(state$))
    .map(([, state]) => state.user);

  const sendIndustries$ = industryPeriods$
    .compose(sampleCombine(state$))
    .map(([key, state]) => [key, state.industries[key]]);

  return {
    sendUser$,
    saveUser$,
    sendIndustries$
  };
};

export default db => {
  const wsRouter = expressWs(express.Router());
  const router = wsRouter.app;

  router.ws("/", (ws, req) => {
    const { userId, socketConnected } = req.session;

    /**
     * TODO This commented code block should probably be enabled in a production
     * build. In development it's not nice to have because it doesn't clear the
     * `socketConnected` value in a session
     */

    // if (socketConnected) {
    //   // TODO need to send a message to client in this case, probably
    //   console.log("User already connected to socket!");
    //   return;
    // }

    // req.session.socketConnected = true;
    // req.session.save();

    // ws.on("error", () => {
    //   req.session.socketConnected = false;
    //   req.session.save();
    // });

    // ws.on("close", () => {
    //   req.session.socketConnected = false;
    //   req.session.save();
    // });

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

    const action$ = xs.create({
      start(listener) {
        ws.on("message", msg => {
          msg = JSON.parse(msg);
          console.log("receieved INDUSTRY message", msg);
          listener.next(msg);
        });
      },
      stop() {}
    });

    xs.fromPromise(
      Promise.all([
        userInformation(db, { userId }).then(updateUserSinceLastActive),
        getIndustries(db, { userId }).then(updateIndustrySinceLastActive)
      ])
    ).addListener({
      next: ([user, industries]) => {
        sendUserListener.next(user);
        sendSaveUserListener.next(user);
        INDUSTRY_KEYS.forEach(key =>
          sendIndustriesListener.next([key, industries[key]])
        );

        const {
          sendUser$,
          saveUser$,
          sendIndustries$
        } = makeStateUpdateStreams({ ws, db, userId }, action$, {
          user,
          industries
        });

        sendIndustries$.addListener(sendIndustriesListener);
        sendUser$.addListener(sendUserListener);
        saveUser$.addListener(sendSaveUserListener);

        ws.on("close", () => {
          sendIndustries$.removeListener(sendIndustriesListener);
          sendUser$.removeListener(sendUserListener);
          saveUser$.removeListener(sendSaveUserListener);
        });
      }
    });
  });

  return router;
};
