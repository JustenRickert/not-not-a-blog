import { assert } from "../util";

export function whole(n) {
  return Math.floor(n).toLocaleString("en", {
    maximumFractionDigits: 0
  });
}

export function decimal(n) {
  if (n < 0.1)
    return n.toLocaleString(undefined, {
      maximumSignificantDigits: 1
    });
  return n.toLocaleString(undefined, {
    maximumFractionDigits: 1
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
