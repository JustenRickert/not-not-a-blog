import express from "express";
import expressWs from "express-ws";
import xs from "xstream";
import throttle from "xstream/extra/throttle";

import { set, update } from "../util";
import { userInformation, saveUser } from "./api/user";
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

const updateSinceLastActive = user => {
  const points =
    user.points + (Date.now() - user.lastSaveDate.getTime()) / 1000;
  const population = growthAfterTime(
    user.population,
    (Date.now() - user.lastSaveDate.getTime()) / 1000,
    1000 + user.points / 100
  );
  return {
    ...user,
    lastSaveDate: new Date(),
    points,
    population
  };
};

const periodicallySendToUser = ({ ws, db, userId }) => {
  const onSendUser = {
    next: user => {
      ws.send(JSON.stringify({ type: "USER", payload: user }));
    }
  };

  const onSaveUser = {
    next: user => {
      saveUser(db, { id: userId, user });
    }
  };

  userInformation(db, { id: userId })
    .then(user => {
      const points$ = xs.periodic(pointsTimeout);
      const population$ = xs.periodic(populationTimeout);
      const lastSaveDate$ = xs.periodic(lastSaveDateTimeout);
      const state$ = xs
        .merge(
          lastSaveDate$.map(() => user =>
            set(user, "lastSaveDate", new Date())
          ),
          points$.map(() => user =>
            update(user, "points", points => points + 1)
          ),
          population$.map(() => user =>
            update(user, "population", population =>
              growthAfterTime(
                population,
                1e3 * populationTimeout,
                1000 + user.points / 100
              )
            )
          )
        )
        .fold((acc, reducer) => reducer(acc), updateSinceLastActive(user));

      const send$ = state$.compose(throttle(sendUserTimeout));
      const save$ = state$.compose(throttle(lastSaveDateTimeout));

      send$.addListener(onSendUser);
      save$.addListener(onSaveUser);

      ws.on("close", () => {
        send$.removeListener(onSendUser);
        save$.removeListener(onSaveUser);
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
