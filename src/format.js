export function whole(n) {
  return Math.floor(n);
}

export function toHumanTime(seconds) {
  if (seconds >= 60 ** 2) return Math.round(seconds / 60 ** 2) + "h";
  if (seconds >= 60) return Math.round(seconds / 60) + "m";
  return Math.round(seconds) + "s";
}
