// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useSessionSocketRequests } from "./use-session-socket-requests";

describe("useSessionSocketRequests", () => {
  it("resolves pending request on matching response", async () => {
    const sendJsonMessage = vi.fn();
    const onReadOnly = vi.fn();
    const { result } = renderHook(() =>
      useSessionSocketRequests({
        connected: true,
        sendJsonMessage,
        onReadOnly,
      }),
    );

    const promise = result.current.sendText("pane-1", "hello");
    const payload = sendJsonMessage.mock.calls[0]?.[0] as { reqId: string };
    expect(payload?.reqId).toBeTruthy();

    act(() => {
      result.current.handleResponseMessage({
        type: "command.response",
        ts: new Date().toISOString(),
        reqId: payload.reqId,
        data: { ok: true },
      });
    });

    await expect(promise).resolves.toMatchObject({ ok: true });
    expect(onReadOnly).not.toHaveBeenCalled();
  });

  it("notifies read-only when response indicates", async () => {
    const sendJsonMessage = vi.fn();
    const onReadOnly = vi.fn();
    const { result } = renderHook(() =>
      useSessionSocketRequests({
        connected: true,
        sendJsonMessage,
        onReadOnly,
      }),
    );

    const promise = result.current.sendKeys("pane-1", ["Enter"]);
    const payload = sendJsonMessage.mock.calls[0]?.[0] as { reqId: string };

    act(() => {
      result.current.handleResponseMessage({
        type: "command.response",
        ts: new Date().toISOString(),
        reqId: payload.reqId,
        data: { ok: false, error: { code: "READ_ONLY", message: "read only" } },
      });
    });

    await expect(promise).resolves.toMatchObject({ ok: false });
    expect(onReadOnly).toHaveBeenCalled();
  });

  it("rejects pending requests when forced", async () => {
    const sendJsonMessage = vi.fn();
    const onReadOnly = vi.fn();
    const { result } = renderHook(() =>
      useSessionSocketRequests({
        connected: true,
        sendJsonMessage,
        onReadOnly,
      }),
    );

    const promise = result.current.sendText("pane-1", "hello");

    act(() => {
      result.current.rejectAllPending(new Error("gone"));
    });

    await expect(promise).rejects.toThrow("gone");
  });
});
