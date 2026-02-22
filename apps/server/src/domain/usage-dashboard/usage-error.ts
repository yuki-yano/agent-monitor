export type UsageProviderErrorCode =
  | "TOKEN_NOT_FOUND"
  | "TOKEN_INVALID"
  | "UPSTREAM_UNAVAILABLE"
  | "UNSUPPORTED_RESPONSE"
  | "INTERNAL"
  | "GLOBAL_TIMELINE_UNAVAILABLE"
  | "CODEX_APP_SERVER_UNAVAILABLE";

export class UsageProviderError extends Error {
  code: UsageProviderErrorCode;
  severity: "warning" | "error";

  constructor(
    code: UsageProviderErrorCode,
    message: string,
    severity: "warning" | "error" = "error",
  ) {
    super(message);
    this.name = "UsageProviderError";
    this.code = code;
    this.severity = severity;
  }
}
