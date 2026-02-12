import { describe, expect, it, vi } from "vitest";

import { createSendTextIdempotencyExecutor } from "./send-text-idempotency";

describe("createSendTextIdempotencyExecutor", () => {
  it("executes every request when requestId is omitted", async () => {
    const executeSendText = vi.fn(async () => ({ ok: true as const }));
    const executor = createSendTextIdempotencyExecutor({});

    await executor.execute({
      paneId: "pane-1",
      text: "ls",
      executeSendText,
    });
    await executor.execute({
      paneId: "pane-1",
      text: "ls",
      executeSendText,
    });

    expect(executeSendText).toHaveBeenCalledTimes(2);
  });

  it("deduplicates by paneId and requestId", async () => {
    const executeSendText = vi.fn(async () => ({ ok: true as const }));
    const executor = createSendTextIdempotencyExecutor({});

    const first = executor.execute({
      paneId: "pane-1",
      text: "ls",
      enter: true,
      requestId: "req-1",
      executeSendText,
    });
    const second = executor.execute({
      paneId: "pane-1",
      text: "ls",
      enter: true,
      requestId: "req-1",
      executeSendText,
    });

    await expect(first).resolves.toEqual({ ok: true });
    await expect(second).resolves.toEqual({ ok: true });
    expect(executeSendText).toHaveBeenCalledTimes(1);
  });

  it("returns mismatch error when requestId payload differs", async () => {
    const executeSendText = vi.fn(async () => ({ ok: true as const }));
    const executor = createSendTextIdempotencyExecutor({});

    await executor.execute({
      paneId: "pane-1",
      text: "ls",
      enter: true,
      requestId: "req-1",
      executeSendText,
    });
    const mismatched = await executor.execute({
      paneId: "pane-1",
      text: "pwd",
      enter: true,
      requestId: "req-1",
      executeSendText,
    });

    expect(mismatched.ok).toBe(false);
    if (mismatched.ok) {
      throw new Error("expected mismatch response");
    }
    if (!mismatched.error) {
      throw new Error("expected mismatch error payload");
    }
    expect(mismatched.error.code).toBe("INVALID_PAYLOAD");
    expect(executeSendText).toHaveBeenCalledTimes(1);
  });

  it("re-executes after ttl expiry", async () => {
    let currentNowMs = 0;
    const executeSendText = vi.fn(async () => ({ ok: true as const }));
    const executor = createSendTextIdempotencyExecutor({
      ttlMs: 1000,
      nowMs: () => currentNowMs,
    });

    await executor.execute({
      paneId: "pane-1",
      text: "ls",
      requestId: "req-1",
      executeSendText,
    });
    currentNowMs = 2000;
    await executor.execute({
      paneId: "pane-1",
      text: "ls",
      requestId: "req-1",
      executeSendText,
    });

    expect(executeSendText).toHaveBeenCalledTimes(2);
  });

  it("re-executes when previous response with same requestId failed", async () => {
    const executeSendText = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false as const,
        error: { code: "RATE_LIMIT", message: "rate limited" },
      })
      .mockResolvedValueOnce({ ok: true as const });
    const executor = createSendTextIdempotencyExecutor({});

    const first = await executor.execute({
      paneId: "pane-1",
      text: "ls",
      requestId: "req-1",
      executeSendText,
    });
    const second = await executor.execute({
      paneId: "pane-1",
      text: "ls",
      requestId: "req-1",
      executeSendText,
    });

    expect(first.ok).toBe(false);
    expect(second).toEqual({ ok: true });
    expect(executeSendText).toHaveBeenCalledTimes(2);
  });
});
