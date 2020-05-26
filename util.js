import {
  INDUSTRIES_UPDATE_SUPPLY_RATE,
  POPULATION_GROWTH_RATE
} from "./constant";

export const toPercentage = n => (100 * n).toPrecision(2) + "%";

export const toWhole = n => Math.floor(n).toLocaleString();

export const toDecimal = n => Number(n).toFixed(1);

export const withPlus = s => (/^-/.test(s) ? s : "+" + s);

export function allKeyPaths(o) {
  const keys = Object.keys(o);
  const [nodes, leaves] = partition(keys, key => typeof o[key] === "object");
  return nodes
    .flatMap(key =>
      allKeyPaths(o[key]).map(childKey => [key, childKey].join("."))
    )
    .concat(leaves);
}

export function sample(xs) {
  return xs[Math.floor(Math.random() * xs.length)];
}

export function update(o, key, fn) {
  if (typeof key === "string") key = key.split(".");
  if (key.length === 0) return fn(o);
  const updated = update(o[key[0]], key.slice(1), fn);
  if (Array.isArray(o))
    return [...o.slice(0, key[0]), updated, ...o.slice(key[0] + 1)];
  return {
    ...o,
    [key[0]]: updated
  };
}

export function updateAll(o, keyFns) {
  return keyFns.reduce((o, [key, fn]) => update(o, key, fn), o);
}

export function drop(xs, count) {
  return xs.slice(count);
}

export function take(xs, count) {
  if (count >= xs.length) return xs;
  return xs.slice(0, count);
}

export function takeRight(xs, count) {
  if (xs.length <= count) return xs;
  return xs.slice(xs.length - count);
}

export function get(o, key) {
  if (typeof key === "string") key = key.split(".");
  if (key.length === 0) return o;
  return get(o[key[0]], key.slice(1));
}

export function set(o, key, value) {
  if (typeof key === "string") key = key.split(".");
  if (key.length === 0) return value;
  if (o === undefined) o = {};
  return {
    ...o,
    [key[0]]: set(o[key[0]], key.slice(1), value)
  };
}

const __uniqueId = {};
export function uniqueId(prefix) {
  return String(prefix) + (++__uniqueId[prefix] || (__uniqueId[prefix] = 0));
}

export function product(xs, toNumeric = x => x) {
  return xs.reduce((p, m) => p * toNumeric(m), 1);
}

export function sum(xs, toNumeric = x => x) {
  return xs.reduce((s, x) => s + toNumeric(x), 0);
}

export function omit(o, keys) {
  return Object.entries(o)
    .filter(([k]) => !keys.includes(k))
    .reduce(
      (o, [k, v]) => ({
        ...o,
        [k]: v
      }),
      {}
    );
}

export function partition(xs, predicate) {
  const left = [];
  const right = [];
  xs.forEach(x => {
    if (predicate(x)) left.push(x);
    else right.push(x);
  });
  return [left, right];
}

export function setAll(o, keyValues) {
  return keyValues.reduce((o, [key, value]) => set(o, key, value), o);
}

export function offset(offsetPercentage = 0.1) {
  return offsetPercentage * (2 * (Math.random() - 1 / 2));
}

export function leaningOffset(leaningPercentage, offsetPercentage = 0.1) {
  return offsetPercentage * (leaningPercentage + 2 * (Math.random() - 1 / 2));
}

export function withRandomOffset(n, offsetPercentage = 0.1) {
  return n * (1 + offset(offsetPercentage));
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

export function industrySupplyDerivative(industryName, industries) {
  const industry = industries[industryName];
  const rate = INDUSTRIES_UPDATE_SUPPLY_RATE[industryName];
  if (typeof rate === "number") {
    return {
      [industryName]: industry.allocation * rate
    };
  }
  const { unit, ...productCosts } = rate;
  return {
    [industryName]: industry.allocation * unit,
    ...Object.entries(productCosts).reduce(
      (acc, [otherIndustryName, unitCost]) => ({
        ...acc,
        [otherIndustryName]: -industry.allocation * unit * unitCost
      }),
      {}
    )
  };
}

/**
 * :shaka: https://en.wikipedia.org/wiki/Logistic_function#In_ecology:_modeling_population_growth
 */
export function growthAfterTime(
  original,
  secondsDiff,
  capacity,
  growthRate = POPULATION_GROWTH_RATE
) {
  return (
    capacity /
    (1 +
      ((capacity - original) / original) *
        Math.E ** (-growthRate * secondsDiff))
  );
}

export function zip(...xss) {
  const min = Math.min(...xss.map(xs => xs.length));
  return range(min).map(i => range(xss.length).map(j => xss[j][i]));
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(n, max));
}

export function logisticDeltaEquation(p, capacity, rate) {
  return p * rate * (1 - p / capacity);
}

export function not(p) {
  return x => !p(x);
}

export function thread(...fns) {
  return state => fns.reduce((state, fn) => fn(state), state);
}

export function range(n) {
  return Array(n)
    .fill()
    .map((_, i) => i);
}

// like which, but without either function
export function cases(/* ...pairs */) {
  const default_ = !Array.isArray(last(arguments)) ? last(arguments) : null;
  const pairs = default_
    ? Array.prototype.slice.call(arguments, 0, -1)
    : arguments;
  return x => {
    for (const [key, value] of pairs) {
      if (x === key) return value;
    }
    if (default_) return default_;
    throw new Error("need to handle all cases");
  };
}

// like cond, but without the second function
export function which(/* ...conditions, default */) {
  const default_ = !Array.isArray(last(arguments)) ? last(arguments) : null;
  const conditions = default_
    ? Array.prototype.slice.call(arguments, 0, -1)
    : arguments;
  return x => {
    for (const [predicate, result] of conditions) {
      if (predicate(x)) return result;
    }
    if (default_) return default_;
    throw new Error("need to handle all cases");
  };
}

const last = xs => xs[xs.length - 1];

/**
 * like which, but without the first function
 */
export function ofWhich(/* ...conditions, default? */) {
  const default_ =
    typeof last(arguments) === "function" ? last(arguments) : null;
  const conditions = default_
    ? Array.prototype.slice.call(arguments, 0, -1)
    : arguments;
  return x => {
    for (const [y, fn] of conditions) {
      if (x === y) return fn(x);
    }
    if (default_) return default_;
    throw new Error("need to handle all cases");
  };
}

export function cond(...conditions) {
  return x => {
    for (const [predicate, resultFn] of conditions) {
      if (predicate(x)) return resultFn(x);
    }
    throw new Error("need to handle all cases");
  };
}

export function assert(condition, text, ...additionalInformation) {
  if (!condition) {
    console.error(...additionalInformation);
    throw new Error(text);
  }
}

export function wait(x) {
  return new Promise(resolve => {
    setTimeout(() => resolve(x), 3e3);
  });
}
