import { Stream } from "xstream";

class EnsureThrottleOperator {
  constructor(dt, ins) {
    this.type = "ensure-throttle";
    this.out = null;
    this.id = null;
    this.ensureId = null;
    this.dt = dt;
    this.ins = ins;
  }

  _start(out) {
    this.out = out;
    this.ins._add(this);
  }

  _stop() {
    this.ins._remove(this);
    this.out = null;
    this.id = null;
    this.ensureId = null;
  }

  clearEnsureInterval() {
    const ensureId = this.ensureId;
    if (ensureId !== null) {
      clearInterval(ensureId);
    }
    this.ensureId = null;
  }

  clearInterval() {
    const id = this.id;
    if (id !== null) {
      clearInterval(id);
    }
    this.id = null;
  }

  _n(t) {
    const u = this.out;
    if (!u) return;
    if (this.id) {
      const ensureId = this.ensureId;
      if (ensureId) {
        this.clearEnsureInterval(ensureId);
      }
      this.ensureId = setInterval(() => {
        u._n(t);
        this.clearEnsureInterval();
      }, this.dt);
      return;
    }
    u._n(t);
    this.clearEnsureInterval();
    this.id = setInterval(() => {
      this.clearInterval();
    }, this.dt);
  }

  _e(err) {
    const u = this.out;
    if (!u) return;
    this.clearInterval();
    u._e(err);
  }

  _c() {
    const u = this.out;
    if (!u) return;
    this.clearInterval();
    u._c();
  }
}

export default function ensureThrottle(period) {
  return function ensureThrottleOperator(ins) {
    return new Stream(new EnsureThrottleOperator(period, ins));
  };
}
