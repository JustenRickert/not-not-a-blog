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
