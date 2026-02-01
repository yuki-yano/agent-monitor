// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createSessionDetail } from "../test-helpers";
import { useSessionLogs } from "./useSessionLogs";

vi.mock("@/lib/ansi", () => ({
  renderAnsiLines: (text: string) => text.split("\n"),
}));

describe("useSessionLogs", () => {
  it("opens log modal and loads log lines", async () => {
    const session = createSessionDetail();
    const requestScreen = vi.fn().mockResolvedValue({
      ok: true,
      paneId: session.paneId,
      mode: "text",
      capturedAt: new Date(0).toISOString(),
      screen: "line1\nline2",
    });

    const { result } = renderHook(() =>
      useSessionLogs({
        connected: true,
        connectionIssue: null,
        sessions: [session],
        requestScreen,
        resolvedTheme: "latte",
      }),
    );

    act(() => {
      result.current.openLogModal(session.paneId);
    });

    await waitFor(() => {
      expect(result.current.selectedLogLines.length).toBe(2);
    });

    expect(requestScreen).toHaveBeenCalledWith(session.paneId, { mode: "text" });
  });

  it("toggles quick panel state", () => {
    const session = createSessionDetail();
    const { result } = renderHook(() =>
      useSessionLogs({
        connected: true,
        connectionIssue: null,
        sessions: [session],
        requestScreen: vi.fn(),
        resolvedTheme: "latte",
      }),
    );

    expect(result.current.quickPanelOpen).toBe(false);
    act(() => {
      result.current.toggleQuickPanel();
    });
    expect(result.current.quickPanelOpen).toBe(true);
  });
});
