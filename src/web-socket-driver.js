import { adapt } from "@cycle/run/lib/adapt";
import xs from "xstream";

export function makeWebSocketDriver() {
  const socket = new WebSocket("ws://" + location.host);

  function webSocketDriver(outgoing$) {
    outgoing$.addListener({
      next: outgoing => {
        socket.send(outgoing);
      },
      error: () => {},
      complete: () => {}
    });

    const incoming$ = xs.create({
      start: listener => {
        socket.onmessage = msg => {
          switch (msg.type) {
            case "message":
              listener.next(JSON.parse(msg.data));
              break;
            default:
              console.error(msg);
              throw new Error("not impl");
          }
        };
        socket.onerror = msg => {
          console.log("error", msg);
          listener.error(msg);
        };
      },
      stop: () => {}
    });

    // what does this do...
    incoming$.addListener({
      next: () => {},
      error: () => {},
      complete: () => {}
    });

    return adapt(incoming$);
  }

  return webSocketDriver;
}
