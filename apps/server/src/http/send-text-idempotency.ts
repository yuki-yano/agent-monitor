import type { CommandResponse } from "@vde-monitor/shared";

import { setMapEntryWithLimit } from "../cache";
import { buildError } from "./helpers";

const DEFAULT_SEND_TEXT_IDEMPOTENCY_TTL_MS = 60_000;
const DEFAULT_SEND_TEXT_IDEMPOTENCY_MAX_ENTRIES = 1000;

type SendTextCacheEntry = {
  paneId: string;
  text: string;
  enter: boolean;
  expiresAtMs: number;
  settled: boolean;
  wasSuccessful: boolean;
  promise: Promise<CommandResponse>;
};

type CreateSendTextIdempotencyExecutorArgs = {
  ttlMs?: number;
  maxEntries?: number;
  nowMs?: () => number;
};

export const createSendTextIdempotencyExecutor = ({
  ttlMs = DEFAULT_SEND_TEXT_IDEMPOTENCY_TTL_MS,
  maxEntries = DEFAULT_SEND_TEXT_IDEMPOTENCY_MAX_ENTRIES,
  nowMs = () => Date.now(),
}: CreateSendTextIdempotencyExecutorArgs) => {
  const sendTextCache = new Map<string, SendTextCacheEntry>();

  const pruneSendTextCache = () => {
    const currentNowMs = nowMs();
    for (const [cacheKey, cached] of sendTextCache.entries()) {
      if (cached.expiresAtMs <= currentNowMs) {
        sendTextCache.delete(cacheKey);
      }
    }
  };

  const execute = async ({
    paneId,
    text,
    enter,
    requestId,
    executeSendText,
  }: {
    paneId: string;
    text: string;
    enter?: boolean;
    requestId?: string;
    executeSendText: (input: {
      paneId: string;
      text: string;
      enter: boolean;
    }) => Promise<CommandResponse>;
  }): Promise<CommandResponse> => {
    const normalizedEnter = enter ?? true;
    if (!requestId) {
      return executeSendText({
        paneId,
        text,
        enter: normalizedEnter,
      });
    }

    pruneSendTextCache();
    const cacheKey = `${paneId}:${requestId}`;
    const currentNowMs = nowMs();
    const cached = sendTextCache.get(cacheKey);
    if (cached && cached.expiresAtMs > currentNowMs) {
      if (cached.text !== text || cached.enter !== normalizedEnter) {
        return {
          ok: false,
          error: buildError("INVALID_PAYLOAD", "requestId payload mismatch"),
        };
      }
      if (!cached.settled || cached.wasSuccessful) {
        return cached.promise;
      }
      sendTextCache.delete(cacheKey);
    } else if (cached) {
      sendTextCache.delete(cacheKey);
    }

    const entry: SendTextCacheEntry = {
      paneId,
      text,
      enter: normalizedEnter,
      expiresAtMs: currentNowMs + ttlMs,
      settled: false,
      wasSuccessful: false,
      promise: executeSendText({
        paneId,
        text,
        enter: normalizedEnter,
      })
        .then((result) => {
          entry.settled = true;
          entry.wasSuccessful = result.ok;
          if (!result.ok) {
            sendTextCache.delete(cacheKey);
          }
          return result;
        })
        .catch((error) => {
          sendTextCache.delete(cacheKey);
          throw error;
        }),
    };
    setMapEntryWithLimit(sendTextCache, cacheKey, entry, maxEntries);
    return entry.promise;
  };

  return { execute };
};
