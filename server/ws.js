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
import { getIndustries, saveIndustries, saveIndustry } from "./api/industry";
import { POPULATION_GROWTH_RATE } from "./constant";
import { growthAfterTime } from "./util";
import {
  industrySupplyChange,
  updateUserSinceLastActive,
  updateIndustrySinceLastActive
} from "./state-update.js";
import { industryActionReducer } from "./industry";

// TODO move these to constants probably... maybe it's not important though
// :shrug:
const pointsTimeout = 1e3;
const populationTimeout = 30e3;
const lastSaveDateTimeout = 120e3;
const lastSaveIndustriesTimeout = 120e3;
const sendUserTimeout = 10e3;

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

  const state$ = xs
    .merge(userUpdater$, industriesUpdater$, industriesReducer$)
    .fold((acc, reducer) => reducer(acc), {
      industries,
      user
    });

  const sendUser$ = xs
    .merge(userPoints$, userPopulation$)
    // .compose(throttle(Math.min(pointsTimeout, populationTimeout)))
    .compose(sampleCombine(state$))
    .map(([, state]) => state.user);

  const saveUser$ = lastSaveUserDate$
    .compose(sampleCombine(state$))
    .map(([, state]) => state.user);

  const saveIndustries$ = xs
    .merge(
      industryAction$.map(a => a.payload.industryName),
      lastSaveIndustriesDate$.mapTo("all")
    )
    .compose(sampleCombine(state$))
    .map(([key, state]) => [key, state.industries]);

  const sendIndustries$ = xs
    .merge(
      industryPeriods$,
      industryAction$.map(({ payload }) => payload.industryName)
    )
    // TODO throttle? Can I throttle this well? Should I?
    .compose(sampleCombine(state$))
    .map(([industryName, state]) => [
      industryName,
      state.industries[industryName]
    ]);

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

    let count = 0;
    const sendIndustriesListener = {
      next([industryName, industry]) {
        ws.send(
          JSON.stringify({
            type: "INDUSTRY",
            payload: { industryName, industry }
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
        INDUSTRY_KEYS.forEach(key =>
          sendIndustriesListener.next([key, industries[key]])
        );
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
