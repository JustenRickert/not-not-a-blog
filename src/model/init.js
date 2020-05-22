import xs from "xstream";

export default function makeInit(_sources) {
  return xs.of(() => ({
    points: 0,
    userInformation: null,
    resources: {}
  }));
}
