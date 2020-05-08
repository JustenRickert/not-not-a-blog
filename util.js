import {
  INDUSTRIES_UPDATE_SUPPLY_RATE,
  POPULATION_GROWTH_RATE
} from "./constant";

export const toPercentage = n => (100 * n).toPrecision(2) + "%";

export const toWhole = n => Math.floor(n).toLocaleString();

export const toDecimal = n => Number(n).toFixed(1);

export const withPlus = s => (/^-/.test(s) ? s : "+" + s);

export function update(o, key, fn) {
  if (typeof key === "string") key = key.split(".");
  if (key.length === 0) return fn(o);
  return {
    ...o,
    [key[0]]: update(o[key[0]], key.slice(1), fn)
  };
}

export function updateAll(o, keyFns) {
  return keyFns.reduce((o, [key, fn]) => update(o, key, fn), o);
}

export function set(o, key, value) {
  if (typeof key === "string") key = key.split(".");
  if (key.length === 0) return value;
  return {
    ...o,
    [key[0]]: set(o[key[0]], key.slice(1), value)
  };
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

// like which, but without either function
export function cases(...pairs) {
  return x => {
    for (const [key, value] of pairs) {
      if (x === key) return value;
    }
    throw new Error("need to handle all cases");
  };
}

// like cond, but without the second function
export function which(...conditions) {
  return x => {
    for (const [predicate, result] of conditions) {
      if (predicate(x)) return result;
    }
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
