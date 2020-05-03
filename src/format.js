export function whole(n) {
  return Math.floor(n);
}

export function decimal(n) {
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
  return withPlus(decimal(n)) + "/s";
}

export function relativeTime(timestamp) {
  const now = Date.now();
  const secondsSince = Math.round((now - timestamp) / 1000);
  if (secondsSince > 60) return (secondsSince % 60) + " minutes ago";
  return secondsSince + " seconds ago";
}

export function plural(n, single, plural) {
  if (whole(n) === 1) return single;
  return plural;
}
