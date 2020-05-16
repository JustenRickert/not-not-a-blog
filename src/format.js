export function whole(n) {
  return Math.floor(n);
}

export function toHumanTime(seconds) {
  if (seconds < 60 * 60) return Math.round(seconds / 60) + "m";
  if (seconds < 60) return Math.round(seconds) + "s";
  return seconds;
}
