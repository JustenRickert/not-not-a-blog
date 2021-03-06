const exponentGroupSymbols = {
  [0]: "",
  [1]: "k",
  [2]: "m",
  [3]: "b",
  [4]: "t",
  [5]: "qa",
  [6]: "qi"
};

export function decimal(n) {
  if (n === 0) return 0;
  const exponentGroup = Math.max(0, Math.floor(Math.log(n) / Math.log(1e3)));
  const exponentSymbol = exponentGroupSymbols[exponentGroup];
  return (
    (n / 1e3 ** exponentGroup).toLocaleString(undefined, {
      maximumSignificantDigits: 3
    }) + exponentSymbol
  );
}

export function whole(n) {
  const exponentGroup = Math.max(0, Math.floor(Math.log(n) / Math.log(1e3)));
  const exponentSymbol = exponentGroupSymbols[exponentGroup];
  return (
    (n / 1e3 ** exponentGroup).toLocaleString(undefined, {
      maximumFractionDigits: exponentGroup > 0 ? 2 : 0
    }) + exponentSymbol
  );
}

export function toHumanTime(seconds) {
  if (seconds >= 60 ** 2) return Math.round(seconds / 60 ** 2) + "h";
  if (seconds >= 60) return Math.round(seconds / 60) + "m";
  return Math.round(seconds) + "s";
}

export function percentage(n) {
  n = 100 * n;
  return (
    n.toLocaleString(undefined, {
      maximumSignificantDigits: n < 1 ? 1 : 2,
      maximumFractionDigits: 1
    }) + "%"
  );
}
