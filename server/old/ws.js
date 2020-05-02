import assert from "assert";
import express from "express";
import expressWs from "express-ws";
import xs from "xstream";
import throttle from "xstream/extra/throttle";
import debounce from "xstream/extra/debounce";
import sampleCombine from "xstream/extra/sampleCombine";

import {
  INDUSTRY_KEYS,
  INDUSTRY_SUPPLY_TIMEOUTS,
  INDUSTRIES_UPDATE_SUPPLY_RATE
} from "../constant";
import { set, update, pick } from "../util";
import { userInformation, saveUser } from "./api/user";
import { getIndustries, saveIndustries, saveIndustry } from "./api/industry";
import { POPULATION_GROWTH_RATE } from "./constant";
import { growthAfterTime } from "./util";
import {
  industrySupplyChange,
  updateUserSinceLastActive,
  updateIndustrySinceLastActive
} from "./state-update.js";
import { industryActionReducer, industriesUnlockReducer } from "./industry";

// TODO move these to constants probably... maybe it's not important though
// :shrug:
const pointsTimeout = 10e3;
const populationTimeout = 60e3;
const lastSaveDateTimeout = 120e3;
const lastSaveIndustriesTimeout = 120e3;
const sendUserTimeout = 10e3;
const unlockTimeout = 120e3;

const makeStateUpdateStreams = (action$, { user, industries }) => {
  const lastSaveUserDate$ = xs.periodic(lastSaveDateTimeout);
  const lastSaveIndustriesDate$ = xs.periodic(lastSaveIndustriesTimeout);
  const userPoints$ = xs.periodic(pointsTimeout);
  const userPopulation$ = xs.periodic(populationTimeout);

  const userUpdater$ = xs.merge(
    lastSaveUserDate$.map(() => state =>
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

  action$.addListener({
    next: console.log,
    error: console.error
  });

  const industryAction$ = action$.filter(a => /^INDUSTRY/.test(a.type));
  const industriesReducer$ = industryAction$.map(industryActionReducer);

  const industriesUnlockPeriod$ = xs.periodic(unlockTimeout);
  const industriesUnlocker$ = industriesUnlockPeriod$.map(
    industriesUnlockReducer
  );

  const state$ = xs
    .merge(
      userUpdater$,
      industriesUpdater$,
      industriesReducer$,
      industriesUnlocker$
    )
    .fold((acc, reducer) => reducer(acc), {
      industries,
      user
    });

  const sendUser$ = xs
    .merge(userPoints$, userPopulation$)
    .compose(sampleCombine(state$))
    .compose(debounce(Math.min(pointsTimeout, populationTimeout)))
    .map(([, state]) => state.user);

  const saveUser$ = lastSaveUserDate$
    .compose(sampleCombine(state$))
    .map(([, state]) => state.user);

  const saveIndustries$ = xs
    .merge(
      industryAction$.map(a => a.payload.industryName),
      xs
        .merge(
          lastSaveIndustriesDate$.mapTo("all"),
          industriesUnlockPeriod$.mapTo("all")
        )
        .compose(debounce(Math.min(lastSaveIndustriesTimeout, unlockTimeout)))
    )
    .compose(sampleCombine(state$))
    .map(([key, state]) => [key, state.industries]);

  const sendIndustries$ = xs
    .merge(
      industryPeriods$.map(industryName => {
        const rate = INDUSTRIES_UPDATE_SUPPLY_RATE[industryName];
        return {
          industryNames:
            typeof rate === "object"
              ? [
                  industryName,
                  ...Object.keys(rate).filter(key => key !== "unit")
                ]
              : [industryName]
        };
      }),
      industryAction$.map(({ type, payload }) => ({
        reason: type,
        industryName: payload.industryName,
        industryNames: [payload.industryName]
      }))
    )
    .compose(sampleCombine(state$))
    .map(([{ reason, industryName, industryNames }, state]) => ({
      reason,
      industryName,
      industries: pick(state.industries, industryNames)
    }));

  return {
    sendUser$,
    saveUser$,
    sendIndustries$,
    saveIndustries$
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
      },
      error: console.error
    };

    const sendIndustriesListener = {
      next({ industries, industryName, reason }) {
        ws.send(
          JSON.stringify({
            type: "INDUSTRY",
            reason,
            payload: { industries, industryName }
          })
        );
      },
      error: console.error
    };

    const sendSaveUserListener = {
      next(user) {
        saveUser(db, { userId, user });
      },
      error: console.error
    };

    const sendSaveIndustryListener = {
      next: ([industryName, industries]) => {
        switch (industryName) {
          case "all":
            // TODO (maybe) test this
            saveIndustries(db, { userId, industries }).then(console.log);
            break;
          default:
            saveIndustry(db, {
              userId,
              industryName,
              industry: industries[industryName]
            });
        }
      },
      error: console.error
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
        sendIndustriesListener.next({ industries });
        // TODO sendSaveIndustryListener

        const {
          sendUser$,
          saveUser$,
          sendIndustries$,
          saveIndustries$
        } = makeStateUpdateStreams(action$, { user, industries });

        sendIndustries$.addListener(sendIndustriesListener);
        sendUser$.addListener(sendUserListener);
        saveUser$.addListener(sendSaveUserListener);
        saveIndustries$.addListener(sendSaveIndustryListener);

        ws.on("close", () => {
          sendIndustries$.removeListener(sendIndustriesListener);
          sendUser$.removeListener(sendUserListener);
          saveUser$.removeListener(sendSaveUserListener);
          saveIndustries$.removeListener(sendSaveIndustryListener);
        });
      },
      error: console.error
    });
  });

  return router;
};
