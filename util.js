// export function sum(xs, toNumeric = x => x) {
//   return xs.reduce((s, x) => s + toNumeric(x), 0);
// }

export function update(o, key, fn) {
  if (typeof key === "string") key = key.split(".");
  if (key.length === 0) return fn(o);
  return {
    ...o,
    [key[0]]: update(o[key[0]], key.slice(1), fn)
  };
}

export function set(o, key, value) {
  if (typeof key === "string") key = key.split(".");
  if (key.length === 0) return value;
  return {
    ...o,
    [key[0]]: set(o[key[0]], key.slice(1), value)
  };
}

export function withRandomOffset(n, offsetPercentage = 0.1) {
  const offset = offsetPercentage * (2 * (Math.random() - 1 / 2));
  return n * (1 + offset);
}

export function pick(o, keys) {
  return keys.reduce(
    (acc, key) => ({
      ...acc,
      [key]: o[key]
    }),
    {}
  );
}
