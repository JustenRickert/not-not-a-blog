export const INDUSTRIES = {
  agriculture: {
    label: "Agriculture",
    from: [{ points: 3 }]
  },
  archery: {
    label: "Archery",
    from: [{ industry: { wood: { supply: 1 }, string: { supply: 3 } } }]
  },
  hunting: {
    label: "Hunting",
    from: [{ points: 3 }, { industry: { archery: { supply: 1 } } }]
  },
  stone: {
    label: "Stone",
    from: [{ points: 1 }]
  },
  string: {
    label: "String",
    from: [{ industry: { wood: { supply: 3 } } }]
  },
  wood: {
    label: "Wood",
    from: [{ points: 1 }]
  }
};
