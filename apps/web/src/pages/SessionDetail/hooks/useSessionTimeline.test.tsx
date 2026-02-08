// @vitest-environment happy-dom
import { act, renderHook, waitFor } from "@testing-library/react";
import type { SessionStateTimeline, SessionStateTimelineRange } from "@vde-monitor/shared";
import { describe, expect, it, vi } from "vitest";

import { createDeferred } from "../test-helpers";
import { useSessionTimeline } from "./useSessionTimeline";

const buildTimeline = (range: SessionStateTimelineRange): SessionStateTimeline => ({
  paneId: "pane-1",
  now: new Date(0).toISOString(),
  range,
  items: [],
  totalsMs: {
    RUNNING: 0,
    WAITING_INPUT: 0,
    WAITING_PERMISSION: 0,
    SHELL: 0,
    UNKNOWN: 0,
  },
  current: null,
});

describe("useSessionTimeline", () => {
  it("loads timeline on mount", async () => {
    const requestStateTimeline = vi.fn().mockResolvedValue(buildTimeline("1h"));

    renderHook(() =>
      useSessionTimeline({
        paneId: "pane-1",
        connected: true,
        requestStateTimeline,
        mobileDefaultCollapsed: false,
      }),
    );

    await waitFor(() => {
      expect(requestStateTimeline).toHaveBeenCalledWith("pane-1", { range: "1h", limit: 200 });
    });
  });

  it("refetches when range changes", async () => {
    const requestStateTimeline = vi
      .fn()
      .mockResolvedValueOnce(buildTimeline("1h"))
      .mockResolvedValueOnce(buildTimeline("15m"));

    const { result } = renderHook(() =>
      useSessionTimeline({
        paneId: "pane-1",
        connected: true,
        requestStateTimeline,
        mobileDefaultCollapsed: false,
      }),
    );

    await waitFor(() => {
      expect(requestStateTimeline).toHaveBeenCalledWith("pane-1", { range: "1h", limit: 200 });
    });

    act(() => {
      result.current.setTimelineRange("15m");
    });

    await waitFor(() => {
      expect(requestStateTimeline).toHaveBeenLastCalledWith("pane-1", {
        range: "15m",
        limit: 200,
      });
    });
  });

  it("starts collapsed on mobile and toggles expanded state", async () => {
    const requestStateTimeline = vi.fn().mockResolvedValue(buildTimeline("1h"));

    const { result } = renderHook(() =>
      useSessionTimeline({
        paneId: "pane-1",
        connected: true,
        requestStateTimeline,
        mobileDefaultCollapsed: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.timelineExpanded).toBe(false);
    });

    act(() => {
      result.current.toggleTimelineExpanded();
    });
    expect(result.current.timelineExpanded).toBe(true);
  });

  it("ignores stale timeline responses from previous pane", async () => {
    const pane1Deferred = createDeferred<SessionStateTimeline>();
    const pane2Timeline: SessionStateTimeline = {
      ...buildTimeline("1h"),
      paneId: "pane-2",
    };
    const requestStateTimeline = vi.fn((paneId: string) =>
      paneId === "pane-1" ? pane1Deferred.promise : Promise.resolve(pane2Timeline),
    );

    const { result, rerender } = renderHook(
      ({ paneId }) =>
        useSessionTimeline({
          paneId,
          connected: true,
          requestStateTimeline,
          mobileDefaultCollapsed: false,
        }),
      {
        initialProps: { paneId: "pane-1" },
      },
    );

    rerender({ paneId: "pane-2" });

    await waitFor(() => {
      expect(result.current.timeline?.paneId).toBe("pane-2");
    });

    pane1Deferred.resolve({
      ...buildTimeline("1h"),
      paneId: "pane-1",
    });

    await waitFor(() => {
      expect(result.current.timeline?.paneId).toBe("pane-2");
    });
  });

  it("keeps the newest timeline when refresh requests resolve out of order", async () => {
    const staleDeferred = createDeferred<SessionStateTimeline>();
    const freshDeferred = createDeferred<SessionStateTimeline>();
    const requestStateTimeline = vi
      .fn()
      .mockImplementationOnce(() => staleDeferred.promise)
      .mockImplementationOnce(() => freshDeferred.promise);

    const { result } = renderHook(() =>
      useSessionTimeline({
        paneId: "pane-1",
        connected: true,
        requestStateTimeline,
        mobileDefaultCollapsed: false,
      }),
    );

    result.current.refreshTimeline();
    freshDeferred.resolve({
      ...buildTimeline("1h"),
      paneId: "pane-1",
    });

    await waitFor(() => {
      expect(result.current.timeline?.paneId).toBe("pane-1");
    });

    staleDeferred.resolve({
      ...buildTimeline("15m"),
      paneId: "pane-1",
    });

    await waitFor(() => {
      expect(result.current.timeline?.range).toBe("1h");
    });
  });
});
