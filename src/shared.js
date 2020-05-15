import { button } from "@cycle/dom";

export const tabButtons = tabs => currentId =>
  tabs.map(({ id, label = id }) =>
    tabButton(id, {
      label,
      currentId
    })
  );

export const tabButton = (id, { label = id, currentId }) =>
  button(
    {
      dataset: { id },
      style: { backgroundColor: currentId === id && "gainsboro" }
    },
    label
  );
