import type { ApiError } from "@vde-monitor/shared";

export const buildError = (code: ApiError["code"], message: string): ApiError => ({
  code,
  message,
});

export const toErrorMessage = (error: unknown, fallbackMessage = "unknown error") => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string" && error.length > 0) {
    return error;
  }
  try {
    const serialized = JSON.stringify(error);
    if (typeof serialized === "string" && serialized.length > 0 && serialized !== "undefined") {
      return serialized;
    }
  } catch {
    // Use fallback when serialization fails.
  }
  return fallbackMessage;
};
