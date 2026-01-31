import { describe, expect, it } from "vitest";

import { initialScreenLoadingState, screenLoadingReducer } from "./screen-loading";

describe("screenLoadingReducer", () => {
  it("keeps loading until the matching mode finishes", () => {
    let state = initialScreenLoadingState;
    state = screenLoadingReducer(state, { type: "start", mode: "text" });
    state = screenLoadingReducer(state, { type: "start", mode: "image" });
    state = screenLoadingReducer(state, { type: "finish", mode: "text" });
    expect(state).toEqual({ loading: true, mode: "image" });
    state = screenLoadingReducer(state, { type: "finish", mode: "image" });
    expect(state).toEqual(initialScreenLoadingState);
  });

  it("resets loading state", () => {
    const state = screenLoadingReducer({ loading: true, mode: "text" }, { type: "reset" });
    expect(state).toEqual(initialScreenLoadingState);
  });
});
