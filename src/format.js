import { assert, cond } from "../util";

const translateWhole = (k, symbol) => n =>
  (n / k).toLocaleString("en", {
    maximumSignificantDigits: 3
  }) + symbol;

const wholeCond = cond(
  [n => Math.abs(n) >= 1e18, translateWhole(1e18, "Qi")],
  [n => Math.abs(n) >= 1e15, translateWhole(1e15, "Qu")],
  [n => Math.abs(n) >= 1e12, translateWhole(1e12, "T")],
  [n => Math.abs(n) >= 1e9, translateWhole(1e9, "B")],
  [n => Math.abs(n) >= 1e6, translateWhole(1e6, "M")],
  [n => Math.abs(n) >= 1e3, translateWhole(1e3, "K")],
  [
    () => true,
    n =>
      n.toLocaleString("en", {
        maximumFractionDigits: 0
      })
  ]
);

function toNiceWhole(n) {
  return wholeCond(n);
}

export function whole(n) {
  return toNiceWhole(Math.floor(n));
}

export function decimal(n) {
  if (Math.abs(n) >= 1e3) return wholeCond(n);
  if (Math.abs(n) >= 1)
    return n.toLocaleString(undefined, {
      maximumFractionDigits: 1
    });
  return n.toLocaleString(undefined, {
    maximumSignificantDigits: 1
  });
}

export function percentage(n) {
  return decimal(100 * n) + "%";
}

const withPlus = s => {
  return !/^-/.test(s) ? "+" + s : s;
};

export function perSecond(n) {
  assert(typeof n === "number" && !isNaN(n), "`n` should be a good number", n);
  return withPlus(decimal(n)) + "/s";
}

export function plural(n, single, plural) {
  if (Math.floor(n) === 1) return single;
  return plural;
}

export function relativeTime(timestamp) {
  const now = Date.now();
  const secondsSince = Math.round((now - timestamp) / 1000);
  if (secondsSince > 60)
    return (
      Math.floor(secondsSince / 60) +
      ` ${plural(secondsSince % 60, "minute", "minutes")}`
    );
  return secondsSince + " " + plural(secondsSince, "second", "seconds");
}

export function time(s) {
  if (s > 60 * 60) {
    const h = Math.floor(s / (60 * 60));
    const m = Math.floor(s % (60 * 60));
    return `${h}:${time(m)}`;
  }
  if (s > 60) {
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, "0")}:${time(s % 60)}`;
  }
  return `${String(Math.floor(s)).padStart(2, "0")}`;
}
