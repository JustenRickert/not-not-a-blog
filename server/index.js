import { MongoClient } from "mongodb";
import ConnectMongo from "connect-mongo";
import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import expressWs from "express-ws";
import path from "path";

import useDevMiddleware from "./dev-middleware";
import wsRouter from "./ws.js";

const wsServer = expressWs(express());
const app = wsServer.app;

if (process.env.NODE_ENV === "development") {
  useDevMiddleware(app);
}

const MongoSessionStore = ConnectMongo(session);

const mongoUrl = "mongodb://localhost:27017";

const mongoClientPromise = MongoClient.connect(mongoUrl).catch(err => {
  console.error(err);
  process.exit(1);
});

const expressSessionConfig = {
  secret: "TODO change me",
  saveUninitialized: false,
  resave: false,
  store: new MongoSessionStore({
    clientPromise: mongoClientPromise,
    url: mongoUrl
  }),
  cookie: {}
};

app.use("/", wsRouter);

app.all("*", express.static(path.join(process.cwd(), "public")));

mongoClientPromise.then(client => {
  app.listen(3000, err => {
    if (err) throw error;
    console.log("listening...");
  });
});
