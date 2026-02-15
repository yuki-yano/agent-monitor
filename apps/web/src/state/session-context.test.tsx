// @vitest-environment happy-dom
import { act, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { http, HttpResponse, server } from "@/test/msw/server";

import { SessionProvider, useSessions } from "./session-context";

const API_BASE_URL = "http://127.0.0.1:11081/api";
const pathToUrl = (path: string) => `${API_BASE_URL}${path}`;

vi.mock("./use-session-token", () => ({
  useSessionToken: () => ({ token: "token", setToken: vi.fn(), apiBaseUrl: API_BASE_URL }),
}));

const ConnectionStatusProbe = () => {
  const { connectionStatus } = useSessions();
  return <div data-testid="connection-status">{connectionStatus}</div>;
};

describe("SessionProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
  });

  it("polls sessions every 1000ms by default", () => {
    vi.useFakeTimers();
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    server.use(
      http.get(pathToUrl("/sessions"), () => {
        return HttpResponse.json({ sessions: [] });
      }),
    );

    render(
      <SessionProvider>
        <div />
      </SessionProvider>,
    );

    const calls = setIntervalSpy.mock.calls.map((call) => call[1]);
    expect(calls).toContain(1000);
  });

  it("pauses polling while hidden and resumes on visibilitychange", async () => {
    vi.useFakeTimers();
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    const addListenerSpy = vi.spyOn(window, "addEventListener");
    let requestCount = 0;
    server.use(
      http.get(pathToUrl("/sessions"), () => {
        requestCount += 1;
        return HttpResponse.json({ sessions: [] });
      }),
    );

    render(
      <SessionProvider>
        <div />
      </SessionProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(requestCount).toBe(1);
    expect(setIntervalSpy).not.toHaveBeenCalled();

    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    const visibilityListener = addListenerSpy.mock.calls.find(
      ([event]) => event === "visibilitychange",
    )?.[1] as EventListener;
    act(() => {
      visibilityListener(new Event("visibilitychange"));
    });

    await act(async () => {
      await Promise.resolve();
    });
    expect(requestCount).toBe(2);
    expect(setIntervalSpy).toHaveBeenCalled();
  });

  it("stops polling on offline events", async () => {
    vi.useFakeTimers();
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");
    const addListenerSpy = vi.spyOn(window, "addEventListener");
    server.use(
      http.get(pathToUrl("/sessions"), () => {
        return HttpResponse.json({ sessions: [] });
      }),
    );

    render(
      <SessionProvider>
        <div />
      </SessionProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(setIntervalSpy).toHaveBeenCalled();

    const intervalId = setIntervalSpy.mock.results[0]?.value;
    const offlineListener = addListenerSpy.mock.calls.find(
      ([event]) => event === "offline",
    )?.[1] as EventListener;
    act(() => {
      offlineListener(new Event("offline"));
    });

    expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);
  });

  it("sets disconnected status after auth error response", async () => {
    let requestCount = 0;
    server.use(
      http.get(pathToUrl("/sessions"), () => {
        requestCount += 1;
        return HttpResponse.json(
          { error: { code: "INVALID_PAYLOAD", message: "unauthorized" } },
          { status: 401 },
        );
      }),
    );

    const { getByTestId } = render(
      <SessionProvider>
        <ConnectionStatusProbe />
      </SessionProvider>,
    );

    await waitFor(() => {
      expect(getByTestId("connection-status").textContent).toBe("disconnected");
    });
    expect(requestCount).toBe(1);
  });
});
