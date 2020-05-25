import { Stream } from "xstream";

import { withRandomOffset } from "../util";

class RoughlyPeriodic {
  constructor(period, offsetPercentage) {
    this.type = "roughly-periodic";
    this.period = period;
    this.offsetPercentage = offsetPercentage;
    this.intervalID = -1;
    this.i = 0;
    this.lastTime = null;
  }

  _start(out) {
    const self = this;
    function intervalHandler() {
      const now = performance.now();
      out._n(now - self.lastTime);
      self.lastTime = now;
      self.intervalID = setTimeout(
        intervalHandler,
        withRandomOffset(self.period, self.offsetPercentage)
      );
    }
    this.lastTime = performance.now();
    this.intervalID = setTimeout(
      intervalHandler,
      withRandomOffset(this.period, self.offsetPercentage)
    );
  }

  _stop() {
    if (this.intervalID !== -1) clearInterval(this.intervalID);
    this.lastTime = null;
    this.intervalID = -1;
    this.i = 0;
  }
}

export default function roughlyPeriodic(period) {
  return new Stream(new RoughlyPeriodic(period));
}
