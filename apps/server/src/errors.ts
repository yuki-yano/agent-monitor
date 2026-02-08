import type { ApiError } from "@vde-monitor/shared";

export const buildError = (code: ApiError["code"], message: string): ApiError => ({
  code,
  message,
});
