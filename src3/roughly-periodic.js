import xs from "xstream";
import { adapt } from "@cycle/run/lib/adapt";

import { withRandomOffset } from "../util";

export default function roughlyPeriodic(
  createOperator,
  period,
  offsetPercentage = 0.25
) {
  const { schedule, currentTime } = createOperator();
  let currentPeriod = withRandomOffset(period, offsetPercentage);
  let lastEmitTime = 0;
  let stopped = false;

  const scheduleNextEvent = (entry, _time, schedule_, _currentTime) => {
    if (stopped) return;
    const value = entry.value + 1;
    currentPeriod = withRandomOffset(period, offsetPercentage);
    schedule_.next(
      entry.stream,
      lastEmitTime + currentPeriod,
      value,
      scheduleNextEvent
    );
    lastEmitTime += period;
  };

  const producer = {
    listener: null,
    start(listener) {
      producer.listener = listener;
      const timeToEmit = currentTime() + currentPeriod;
      schedule.next(listener, timeToEmit, 0, scheduleNextEvent);
      lastEmitTime = timeToEmit;
    },
    stop() {
      stopped = true;
      producer.listener.complete();
    }
  };

  return adapt(xs.create(producer));
}
