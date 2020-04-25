import express from "express";

import makeWsRouter from "./ws.js";

export default db => {
  const router = express.Router();

  router.use("/", makeWsRouter(db));

  return router;
};
