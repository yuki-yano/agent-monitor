// @vitest-environment happy-dom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useSessionScreen } from "./useSessionScreen";

vi.mock("@/lib/ansi", () => ({
  renderAnsiLines: () => ["rendered-line"],
}));

describe("useSessionScreen", () => {
  it("sets disconnected error when not connected", async () => {
    const requestScreen = vi.fn();
    const { result } = renderHook(() =>
      useSessionScreen({
        paneId: "pane-1",
        connected: false,
        connectionIssue: null,
        requestScreen,
        resolvedTheme: "latte",
        agent: "codex",
      }),
    );

    await waitFor(() => {
      expect(result.current.error).toBe("Disconnected. Reconnecting...");
    });
  });

  it("loads screen lines when connected", async () => {
    const requestScreen = vi.fn().mockResolvedValue({
      ok: true,
      paneId: "pane-1",
      mode: "text",
      capturedAt: new Date(0).toISOString(),
      screen: "hello",
    });

    const { result } = renderHook(() =>
      useSessionScreen({
        paneId: "pane-1",
        connected: true,
        connectionIssue: null,
        requestScreen,
        resolvedTheme: "latte",
        agent: "codex",
      }),
    );

    await waitFor(() => {
      expect(result.current.screenLines).toEqual(["rendered-line"]);
    });
  });

  it("changes mode via handler", () => {
    const requestScreen = vi.fn().mockResolvedValue({
      ok: true,
      paneId: "pane-1",
      mode: "text",
      capturedAt: new Date(0).toISOString(),
      screen: "hello",
    });

    const { result } = renderHook(() =>
      useSessionScreen({
        paneId: "pane-1",
        connected: true,
        connectionIssue: null,
        requestScreen,
        resolvedTheme: "latte",
        agent: "codex",
      }),
    );

    act(() => {
      result.current.handleModeChange("image");
    });

    expect(result.current.mode).toBe("image");
  });
});
