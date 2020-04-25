import express from "express";
import expressWs from "express-ws";
import xs from "xstream";
import throttle from "xstream/extra/throttle";
import delay from "xstream/extra/delay";

import { userInformation, saveUser } from "./api/user";

const periodicallySendPoints = ({ ws, db, userId }) => {
  const onSendPoints = {
    next: user =>
      ws.send(JSON.stringify({ type: "POINTS", points: user.points }))
  };

  const onSaveUser = {
    next: user => saveUser(db, { id: userId, user })
  };

  userInformation(db, { id: userId })
    .then(user => {
      const points$ = xs.periodic(1e3);

      const state$ = points$
        .map(() => state => ({
          ...state,
          points: state.points + 1
        }))
        .fold((acc, reducer) => reducer(acc), user);

      const saveUser$ = state$
        .map(state => ({
          ...state,
          lastSaveDate: new Date()
        }))
        .compose(delay(30e3))
        .compose(throttle(30e3));

      state$.addListener(onSendPoints);
      saveUser$.addListener(onSaveUser);

      ws.on("close", () => {
        state$.removeListener(onSendPoints);
        saveUser$.removeListener(onSaveUser);
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

    periodicallySendPoints({ ws, db, userId: req.session.userId });
  });

  return router;
};
