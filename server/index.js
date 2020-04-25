import assert from "assert";
import { MongoClient } from "mongodb";
import ConnectMongo from "connect-mongo";
import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import expressWs from "express-ws";
import path from "path";

import { authenticateUser, newUser } from "./api/password";
import useDevMiddleware from "./dev-middleware";
import makeRouter from "./router";

const wsServer = expressWs(express());
const app = wsServer.app;

if (process.env.NODE_ENV === "development") {
  useDevMiddleware(app);
}

const MongoSessionStore = ConnectMongo(session);

const mongoUrl = "mongodb://localhost:27017";
const mongoDbName = "notblog";

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

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session(expressSessionConfig));

mongoClientPromise.then(client => {
  const db = client.db(mongoDbName);

  app.post("/login", (req, res) => {
    authenticateUser(db, req.body)
      .then(_id => {
        req.session.authenticated = true;
        req.session.userId = _id;
        res.redirect(301, "/index.html");
      })
      .catch(() => res.send(401).send());
  });

  app.post("/new-user", (req, res) => {
    if (req.body.username && req.body.password) {
      newUser(db, req.body).then(({ result: { ok }, ops: [{ _id }] }) => {
        assert(ok, "should be ok");
        req.session.authenticated = true;
        req.session.userId = _id;
        res.redirect(301, "/index.html");
      });
    } else {
      res.status(401).send();
    }
  });

  app.use((req, res, next) => {
    if (!req.session.authenticated) {
      switch (req.url) {
        case "/new-user.html":
          return res.status(401).sendFile("new-user.html", { root: "public" });
        case "/login.html":
        default:
          return res.status(401).sendFile("login.html", { root: "public" });
      }
    }
    next();
  });

  app.use("/", makeRouter(db));

  app.all("*", express.static(path.join(process.cwd(), "public")));

  app.listen(3000, err => {
    if (err) throw error;
    console.log("listening...");
  });
});
