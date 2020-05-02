import express from "express";

import { getUserData, saveUserData } from "./api/user";

export default db => {
  const router = express.Router();

  router.post("/user-data", (req, res) => {
    const { userId } = req.session;
    const { data } = req.body;
    saveUserData(db, { userId, data })
      .then(result => {
        if (!result.result.ok) throw new Error("Result is not okay?!?");
        res.status(200).send();
      })
      .catch(console.error);
  });

  router.get("/user-data", (req, res) => {
    const { userId } = req.session;
    getUserData(db, { userId })
      .then(result => {
        if (!result) res.status(404).send();
        res.json(result);
      })
      .catch(console.error);
  });

  return router;
};
