import { button, div } from "@cycle/dom";

import { range } from "../util";

import "./loading.css";

export const loading = div(".loading", range(4).map(() => div(["."])));

export const tabButtons = tabs => currentId =>
  tabs.map(({ id, label = id }) =>
    tabButton(id, {
      label,
      currentId
    })
  );

export const tabButton = (id, { label = id, currentId }) =>
  div(
    button(
      {
        dataset: { id },
        style: { backgroundColor: currentId === id && "gainsboro" }
      },
      label
    )
  );
