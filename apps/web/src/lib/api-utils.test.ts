import type { ApiEnvelope } from "@vde-monitor/shared";
import { describe, expect, it } from "vitest";

import { API_ERROR_MESSAGES } from "./api-messages";
import { expectField, extractErrorMessage } from "./api-utils";

describe("api-utils", () => {
  it("returns unauthorized message for 401/403", () => {
    const res = { status: 401, ok: false } as Response;
    const message = extractErrorMessage(res, null, "fallback");
    expect(message).toBe(API_ERROR_MESSAGES.unauthorized);
  });

  it("prefers API error message when present", () => {
    const res = { status: 500, ok: false } as Response;
    const data: ApiEnvelope<unknown> = {
      error: { code: "INTERNAL", message: "boom" },
    };
    const message = extractErrorMessage(res, data, "fallback");
    expect(message).toBe("boom");
  });

  it("includes status when requested", () => {
    const res = { status: 500, ok: false } as Response;
    const message = extractErrorMessage(res, null, API_ERROR_MESSAGES.requestFailed, {
      includeStatus: true,
    });
    expect(message).toBe(`${API_ERROR_MESSAGES.requestFailed} (500)`);
  });

  it("returns expected field or throws", () => {
    const res = { status: 200, ok: true } as Response;
    const data = { value: 42 } as ApiEnvelope<{ value: number }>;
    expect(expectField(res, data, "value", "fallback")).toBe(42);
    const missing = { value: null } as ApiEnvelope<{ value: number | null }>;
    expect(() => expectField(res, missing, "value", "fallback")).toThrow("fallback");
  });
});
