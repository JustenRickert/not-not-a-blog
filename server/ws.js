import express from "express";
import expressWs from "express-ws";
import xs from "xstream";

const wsRouter = expressWs(express.Router());
const router = wsRouter.app;

router.ws("/", (ws, req) => {
  ws.on("message", msg => {
    console.log("receieved message");
  });
  const elapsed$ = xs
    .periodic(1e3)
    .map(i => i + 1)
    .startWith(0);
  elapsed$.addListener({
    next: count => ws.send(JSON.stringify({ type: "COUNT", count }))
  });
  ws.on("close", () => {
    elapsed$.shamefullySendComplete();
  });
});

export default router;
