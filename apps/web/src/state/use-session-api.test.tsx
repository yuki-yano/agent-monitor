// @vitest-environment happy-dom
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { API_ERROR_MESSAGES } from "@/lib/api-messages";
import { http, HttpResponse, server } from "@/test/msw/server";

import { useSessionApi } from "./use-session-api";

const API_BASE_URL = "http://127.0.0.1:11081/api";

const pathToUrl = (path: string) => `${API_BASE_URL}${path}`;

const createDeferred = <T = void,>() => {
  let resolve: ((value: T) => void) | null = null;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return {
    promise,
    resolve: (value: T) => {
      resolve?.(value);
    },
  };
};

describe("useSessionApi", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("uses apiBaseUrl when provided", async () => {
    let requestedAuthorization: string | null = null;
    server.use(
      http.get(pathToUrl("/sessions"), ({ request }) => {
        requestedAuthorization = request.headers.get("authorization");
        return HttpResponse.json({ sessions: [] });
      }),
    );

    const { result } = renderHook(() =>
      useSessionApi({
        token: "token",
        apiBaseUrl: API_BASE_URL,
        onSessions: vi.fn(),
        onConnectionIssue: vi.fn(),
        onSessionUpdated: vi.fn(),
        onSessionRemoved: vi.fn(),
        onHighlightCorrections: vi.fn(),
        onFileNavigatorConfig: vi.fn(),
      }),
    );

    await expect(result.current.refreshSessions()).resolves.toMatchObject({ ok: true });
    expect(requestedAuthorization).toBe("Bearer token");
  });

  it("dedupes in-flight screen requests", async () => {
    const deferred = createDeferred<void>();
    let requestCount = 0;
    server.use(
      http.post(pathToUrl("/sessions/:paneId/screen"), async () => {
        requestCount += 1;
        await deferred.promise;
        return HttpResponse.json({
          screen: {
            ok: true,
            paneId: "pane-1",
            mode: "text",
            capturedAt: new Date(0).toISOString(),
            screen: "ok",
          },
        });
      }),
    );

    const { result } = renderHook(() =>
      useSessionApi({
        token: "token",
        apiBaseUrl: API_BASE_URL,
        onSessions: vi.fn(),
        onConnectionIssue: vi.fn(),
        onSessionUpdated: vi.fn(),
        onSessionRemoved: vi.fn(),
        onHighlightCorrections: vi.fn(),
        onFileNavigatorConfig: vi.fn(),
      }),
    );

    const promise1 = result.current.requestScreen("pane-1", { mode: "text" });
    const promise2 = result.current.requestScreen("pane-1", { mode: "text" });

    await waitFor(() => {
      expect(requestCount).toBe(1);
    });

    deferred.resolve();

    await expect(promise1).resolves.toMatchObject({ ok: true, paneId: "pane-1" });
    await expect(promise2).resolves.toMatchObject({ ok: true, paneId: "pane-1" });
  });

  it("does not remove session when commit detail is missing", async () => {
    const onSessionRemoved = vi.fn();
    server.use(
      http.get(pathToUrl("/sessions/:paneId/commits/:hash"), () => {
        return HttpResponse.json(
          { error: { code: "NOT_FOUND", message: "commit not found" } },
          { status: 404 },
        );
      }),
    );

    const { result } = renderHook(() =>
      useSessionApi({
        token: "token",
        apiBaseUrl: API_BASE_URL,
        onSessions: vi.fn(),
        onConnectionIssue: vi.fn(),
        onSessionUpdated: vi.fn(),
        onSessionRemoved,
        onHighlightCorrections: vi.fn(),
        onFileNavigatorConfig: vi.fn(),
      }),
    );

    await expect(result.current.requestCommitDetail("pane-1", "hash")).rejects.toThrow(
      "commit not found",
    );
    expect(onSessionRemoved).not.toHaveBeenCalled();
  });

  it("removes session when pane is invalid", async () => {
    const onSessionRemoved = vi.fn();
    server.use(
      http.get(pathToUrl("/sessions/:paneId/commits/:hash"), () => {
        return HttpResponse.json(
          { error: { code: "INVALID_PANE", message: "pane not found" } },
          { status: 404 },
        );
      }),
    );

    const { result } = renderHook(() =>
      useSessionApi({
        token: "token",
        apiBaseUrl: API_BASE_URL,
        onSessions: vi.fn(),
        onConnectionIssue: vi.fn(),
        onSessionUpdated: vi.fn(),
        onSessionRemoved,
        onHighlightCorrections: vi.fn(),
        onFileNavigatorConfig: vi.fn(),
      }),
    );

    await expect(result.current.requestCommitDetail("pane-1", "hash")).rejects.toThrow(
      "pane not found",
    );
    expect(onSessionRemoved).toHaveBeenCalledWith("pane-1");
  });

  it("removes session when diff summary endpoint returns 410", async () => {
    const onSessionRemoved = vi.fn();
    server.use(
      http.get(pathToUrl("/sessions/:paneId/diff"), () => {
        return new HttpResponse(null, { status: 410 });
      }),
    );

    const { result } = renderHook(() =>
      useSessionApi({
        token: "token",
        apiBaseUrl: API_BASE_URL,
        onSessions: vi.fn(),
        onConnectionIssue: vi.fn(),
        onSessionUpdated: vi.fn(),
        onSessionRemoved,
        onHighlightCorrections: vi.fn(),
        onFileNavigatorConfig: vi.fn(),
      }),
    );

    await expect(result.current.requestDiffSummary("pane-1")).rejects.toThrow(
      `${API_ERROR_MESSAGES.diffSummary} (410)`,
    );
    expect(onSessionRemoved).toHaveBeenCalledWith("pane-1");
  });

  it("refreshes sessions when touch response has no session payload", async () => {
    const onSessions = vi.fn();
    const onSessionUpdated = vi.fn();
    server.use(
      http.post(pathToUrl("/sessions/:paneId/touch"), () => {
        return HttpResponse.json({});
      }),
      http.get(pathToUrl("/sessions"), () => {
        return HttpResponse.json({ sessions: [] });
      }),
    );

    const { result } = renderHook(() =>
      useSessionApi({
        token: "token",
        apiBaseUrl: API_BASE_URL,
        onSessions,
        onConnectionIssue: vi.fn(),
        onSessionUpdated,
        onSessionRemoved: vi.fn(),
        onHighlightCorrections: vi.fn(),
        onFileNavigatorConfig: vi.fn(),
      }),
    );

    await expect(result.current.touchSession("pane-1")).resolves.toBeUndefined();
    expect(onSessionUpdated).not.toHaveBeenCalled();
    expect(onSessions).toHaveBeenCalledWith([]);
  });

  it("refreshes sessions when title update response has no session payload", async () => {
    const onSessions = vi.fn();
    const onSessionUpdated = vi.fn();
    server.use(
      http.put(pathToUrl("/sessions/:paneId/title"), () => {
        return HttpResponse.json({});
      }),
      http.get(pathToUrl("/sessions"), () => {
        return HttpResponse.json({ sessions: [] });
      }),
    );

    const { result } = renderHook(() =>
      useSessionApi({
        token: "token",
        apiBaseUrl: API_BASE_URL,
        onSessions,
        onConnectionIssue: vi.fn(),
        onSessionUpdated,
        onSessionRemoved: vi.fn(),
        onHighlightCorrections: vi.fn(),
        onFileNavigatorConfig: vi.fn(),
      }),
    );

    await expect(result.current.updateSessionTitle("pane-1", "next")).resolves.toBeUndefined();
    expect(onSessionUpdated).not.toHaveBeenCalled();
    expect(onSessions).toHaveBeenCalledWith([]);
  });

  it("sends text command successfully", async () => {
    const onConnectionIssue = vi.fn();
    let payload: unknown = null;
    server.use(
      http.post(pathToUrl("/sessions/:paneId/send/text"), async ({ request }) => {
        payload = await request.json();
        return HttpResponse.json({ command: { ok: true } });
      }),
    );

    const { result } = renderHook(() =>
      useSessionApi({
        token: "token",
        apiBaseUrl: API_BASE_URL,
        onSessions: vi.fn(),
        onConnectionIssue,
        onSessionUpdated: vi.fn(),
        onSessionRemoved: vi.fn(),
        onHighlightCorrections: vi.fn(),
        onFileNavigatorConfig: vi.fn(),
      }),
    );

    await expect(result.current.sendText("pane-1", "echo hello")).resolves.toEqual({ ok: true });
    expect(payload).toMatchObject({ text: "echo hello", enter: true });
    expect(onConnectionIssue).toHaveBeenCalledWith(null);
  });

  it("returns command response when focus endpoint returns logical error", async () => {
    const onConnectionIssue = vi.fn();
    server.use(
      http.post(pathToUrl("/sessions/:paneId/focus"), () => {
        return HttpResponse.json({
          command: {
            ok: false,
            error: { code: "RATE_LIMIT", message: "rate limited" },
          },
        });
      }),
    );

    const { result } = renderHook(() =>
      useSessionApi({
        token: "token",
        apiBaseUrl: API_BASE_URL,
        onSessions: vi.fn(),
        onConnectionIssue,
        onSessionUpdated: vi.fn(),
        onSessionRemoved: vi.fn(),
        onHighlightCorrections: vi.fn(),
        onFileNavigatorConfig: vi.fn(),
      }),
    );

    await expect(result.current.focusPane("pane-1")).resolves.toMatchObject({
      ok: false,
      error: { code: "RATE_LIMIT", message: "rate limited" },
    });
    expect(onConnectionIssue).toHaveBeenCalledWith(null);
  });
});
