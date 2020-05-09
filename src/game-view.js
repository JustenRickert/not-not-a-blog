import isolate from "@cycle/isolate";
import Beginning from "./game-views/beginning";

/**
 * FIXME: I originally had different ideas about `game-views`, but have since
 * changed my mind. As such, `Beginning` is a terrible name. It is the main game
 * view. Don't think anything different. :)
 */

export default isolate(Beginning, {
  state: {
    get: state => state,
    set: (_, state) => state
  }
});
