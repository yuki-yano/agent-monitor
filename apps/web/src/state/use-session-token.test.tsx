// @vitest-environment happy-dom
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useSessionToken } from "./use-session-token";

const resetLocation = (path = "/") => {
  window.history.replaceState({}, "", path);
};

afterEach(() => {
  localStorage.clear();
  resetLocation();
});

describe("useSessionToken", () => {
  it("reads token from URL and stores it", async () => {
    resetLocation("/sessions?token=abc123&foo=bar");

    const { result } = renderHook(() => useSessionToken());

    await waitFor(() => {
      expect(result.current.token).toBe("abc123");
    });

    expect(localStorage.getItem("vde-monitor-token")).toBe("abc123");
    expect(window.location.search).toBe("?foo=bar");
  });

  it("uses stored token when URL has none", () => {
    localStorage.setItem("vde-monitor-token", "stored-token");
    resetLocation("/sessions?foo=bar");

    const { result } = renderHook(() => useSessionToken());

    expect(result.current.token).toBe("stored-token");
    expect(window.location.search).toBe("?foo=bar");
  });
});
