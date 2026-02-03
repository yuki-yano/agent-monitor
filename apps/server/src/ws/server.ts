import { randomUUID } from "node:crypto";

import type { createNodeWebSocket } from "@hono/node-ws";
import type {
  AgentMonitorConfig,
  CommandResponse,
  ScreenResponse,
  WsEnvelope,
  WsServerMessage,
} from "@vde-monitor/shared";
import { wsClientMessageSchema } from "@vde-monitor/shared";
import type { WSContext } from "hono/ws";

import { buildError, nowIso } from "../http/helpers.js";
import type { createSessionMonitor } from "../monitor.js";
import { buildScreenDeltas, shouldSendFull } from "../screen-diff.js";
import { captureTerminalScreen } from "../screen-service.js";
import type { createTmuxActions } from "../tmux-actions.js";

type Monitor = ReturnType<typeof createSessionMonitor>;
type TmuxActions = ReturnType<typeof createTmuxActions>;
type UpgradeWebSocket = ReturnType<typeof createNodeWebSocket>["upgradeWebSocket"];

type ScreenSnapshot = {
  cursor: string;
  lines: string[];
  alternateOn: boolean;
  truncated: boolean | null;
};

const buildEnvelope = <TType extends string, TData>(
  type: TType,
  data: TData,
  reqId?: string,
): WsEnvelope<TType, TData> => ({
  type,
  ts: nowIso(),
  reqId,
  data,
});

const createRateLimiter = (windowMs: number, max: number) => {
  const hits = new Map<string, { count: number; expiresAt: number }>();
  return (key: string) => {
    const nowMs = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.expiresAt <= nowMs) {
      hits.set(key, { count: 1, expiresAt: nowMs + windowMs });
      return true;
    }
    if (entry.count >= max) {
      return false;
    }
    entry.count += 1;
    return true;
  };
};

export const createWsServer = ({
  config,
  monitor,
  tmuxActions,
  upgradeWebSocket,
}: {
  config: AgentMonitorConfig;
  monitor: Monitor;
  tmuxActions: TmuxActions;
  upgradeWebSocket: UpgradeWebSocket;
}) => {
  const wsClients = new Set<WSContext>();

  const sendLimiter = createRateLimiter(config.rateLimit.send.windowMs, config.rateLimit.send.max);
  const screenLimiter = createRateLimiter(
    config.rateLimit.screen.windowMs,
    config.rateLimit.screen.max,
  );

  const SCREEN_CACHE_LIMIT = 10;
  const screenCache = new Map<string, Map<string, ScreenSnapshot>>();

  const splitScreenLines = (value: string) => value.replace(/\r\n/g, "\n").split("\n");

  const getScreenCacheKey = (paneId: string, lineCount: number) => `${paneId}:text:${lineCount}`;

  const storeScreenSnapshot = (cacheKey: string, snapshot: ScreenSnapshot) => {
    const bucket = screenCache.get(cacheKey) ?? new Map<string, ScreenSnapshot>();
    bucket.set(snapshot.cursor, snapshot);
    while (bucket.size > SCREEN_CACHE_LIMIT) {
      const oldestKey = bucket.keys().next().value;
      if (!oldestKey) break;
      bucket.delete(oldestKey);
    }
    screenCache.set(cacheKey, bucket);
  };

  const buildTextResponse = ({
    paneId,
    lineCount,
    screen,
    alternateOn,
    truncated,
    cursor,
    fallbackReason,
  }: {
    paneId: string;
    lineCount: number;
    screen: string;
    alternateOn: boolean;
    truncated: boolean | null;
    cursor?: string;
    fallbackReason?: "image_failed" | "image_disabled";
  }): ScreenResponse => {
    const cacheKey = getScreenCacheKey(paneId, lineCount);
    const bucket = screenCache.get(cacheKey);
    const previous = cursor ? bucket?.get(cursor) : null;

    const nextLines = splitScreenLines(screen);
    const nextCursor = randomUUID();
    storeScreenSnapshot(cacheKey, {
      cursor: nextCursor,
      lines: nextLines,
      alternateOn,
      truncated,
    });

    const response: ScreenResponse = {
      ok: true,
      paneId,
      mode: "text",
      capturedAt: nowIso(),
      lines: lineCount,
      truncated,
      alternateOn,
      cursor: nextCursor,
    };
    if (fallbackReason) {
      response.fallbackReason = fallbackReason;
    }

    if (!cursor || !previous) {
      response.full = true;
      response.screen = screen;
      return response;
    }

    if (previous.alternateOn !== alternateOn || previous.truncated !== truncated) {
      response.full = true;
      response.screen = screen;
      return response;
    }

    const deltas = buildScreenDeltas(previous.lines, nextLines);
    if (shouldSendFull(previous.lines.length, nextLines.length, deltas)) {
      response.full = true;
      response.screen = screen;
      return response;
    }

    response.full = false;
    response.deltas = deltas;
    return response;
  };

  const sendWs = (ws: WSContext, message: WsServerMessage) => {
    ws.send(JSON.stringify(message));
  };

  const closeAllWsClients = (code: number, reason: string) => {
    wsClients.forEach((ws) => {
      try {
        ws.close(code, reason);
      } catch {
        // Ignore close errors to ensure full cleanup.
      }
    });
    wsClients.clear();
  };

  const broadcast = (message: WsServerMessage) => {
    const payload = JSON.stringify(message);
    wsClients.forEach((ws) => ws.send(payload));
  };

  monitor.registry.onChanged((session) => {
    broadcast(buildEnvelope("session.updated", { session }));
  });

  monitor.registry.onRemoved((paneId) => {
    broadcast(buildEnvelope("session.removed", { paneId }));
  });

  const wsHandler = upgradeWebSocket(() => ({
    onOpen: (_event, ws) => {
      wsClients.add(ws);
      sendWs(ws, buildEnvelope("sessions.snapshot", { sessions: monitor.registry.snapshot() }));
      sendWs(ws, buildEnvelope("server.health", { version: "0.0.1" }));
    },
    onClose: (_event, ws) => {
      wsClients.delete(ws);
    },
    onMessage: async (event, ws) => {
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(event.data.toString());
      } catch {
        sendWs(
          ws,
          buildEnvelope("command.response", {
            ok: false,
            error: buildError("INVALID_PAYLOAD", "invalid json"),
          } as CommandResponse),
        );
        return;
      }

      const parsed = wsClientMessageSchema.safeParse(parsedJson);
      if (!parsed.success) {
        sendWs(
          ws,
          buildEnvelope("command.response", {
            ok: false,
            error: buildError("INVALID_PAYLOAD", "invalid payload"),
          } as CommandResponse),
        );
        return;
      }

      const message = parsed.data;
      const reqId = message.reqId;
      if (message.type === "client.ping") {
        sendWs(ws, buildEnvelope("server.health", { version: "0.0.1" }, reqId));
        return;
      }

      const target = monitor.registry.getDetail(message.data.paneId);
      if (!target) {
        if (message.type === "screen.request") {
          sendWs(
            ws,
            buildEnvelope(
              "screen.response",
              {
                ok: false,
                paneId: message.data.paneId,
                mode: message.data.mode ?? config.screen.mode,
                capturedAt: nowIso(),
                error: buildError("NOT_FOUND", "pane not found"),
              } as ScreenResponse,
              reqId,
            ),
          );
        } else {
          sendWs(
            ws,
            buildEnvelope(
              "command.response",
              { ok: false, error: buildError("NOT_FOUND", "pane not found") },
              reqId,
            ),
          );
        }
        return;
      }

      if (message.type === "screen.request") {
        const clientKey = "ws";
        if (!screenLimiter(clientKey)) {
          sendWs(
            ws,
            buildEnvelope(
              "screen.response",
              {
                ok: false,
                paneId: message.data.paneId,
                mode: "text",
                capturedAt: nowIso(),
                error: buildError("RATE_LIMIT", "rate limited"),
              } as ScreenResponse,
              reqId,
            ),
          );
          return;
        }

        const mode = message.data.mode ?? config.screen.mode;
        const lineCount = Math.min(
          message.data.lines ?? config.screen.defaultLines,
          config.screen.maxLines,
        );

        if (mode === "image") {
          if (!config.screen.image.enabled) {
            try {
              const text = await monitor.getScreenCapture().captureText({
                paneId: message.data.paneId,
                lines: lineCount,
                joinLines: config.screen.joinLines,
                includeAnsi: config.screen.ansi,
                altScreen: config.screen.altScreen,
                alternateOn: target.alternateOn,
              });
              const response = buildTextResponse({
                paneId: message.data.paneId,
                lineCount,
                screen: text.screen,
                alternateOn: text.alternateOn,
                truncated: text.truncated,
                cursor: message.data.cursor,
                fallbackReason: "image_disabled",
              });
              sendWs(ws, buildEnvelope("screen.response", response, reqId));
              return;
            } catch {
              sendWs(
                ws,
                buildEnvelope(
                  "screen.response",
                  {
                    ok: false,
                    paneId: message.data.paneId,
                    mode: "text",
                    capturedAt: nowIso(),
                    error: buildError("INTERNAL", "screen capture failed"),
                  } as ScreenResponse,
                  reqId,
                ),
              );
              return;
            }
          }
          const imageResult = await captureTerminalScreen(target.paneTty, {
            paneId: message.data.paneId,
            tmux: config.tmux,
            cropPane: config.screen.image.cropPane,
            backend: config.screen.image.backend,
          });
          if (imageResult) {
            sendWs(
              ws,
              buildEnvelope(
                "screen.response",
                {
                  ok: true,
                  paneId: message.data.paneId,
                  mode: "image",
                  capturedAt: nowIso(),
                  imageBase64: imageResult.imageBase64,
                  cropped: imageResult.cropped,
                } as ScreenResponse,
                reqId,
              ),
            );
            return;
          }
          try {
            const text = await monitor.getScreenCapture().captureText({
              paneId: message.data.paneId,
              lines: lineCount,
              joinLines: config.screen.joinLines,
              includeAnsi: config.screen.ansi,
              altScreen: config.screen.altScreen,
              alternateOn: target.alternateOn,
            });
            const response = buildTextResponse({
              paneId: message.data.paneId,
              lineCount,
              screen: text.screen,
              alternateOn: text.alternateOn,
              truncated: text.truncated,
              cursor: message.data.cursor,
              fallbackReason: "image_failed",
            });
            sendWs(ws, buildEnvelope("screen.response", response, reqId));
            return;
          } catch {
            sendWs(
              ws,
              buildEnvelope(
                "screen.response",
                {
                  ok: false,
                  paneId: message.data.paneId,
                  mode: "text",
                  capturedAt: nowIso(),
                  error: buildError("INTERNAL", "screen capture failed"),
                } as ScreenResponse,
                reqId,
              ),
            );
            return;
          }
        }

        try {
          const text = await monitor.getScreenCapture().captureText({
            paneId: message.data.paneId,
            lines: lineCount,
            joinLines: config.screen.joinLines,
            includeAnsi: config.screen.ansi,
            altScreen: config.screen.altScreen,
            alternateOn: target.alternateOn,
          });
          const response = buildTextResponse({
            paneId: message.data.paneId,
            lineCount,
            screen: text.screen,
            alternateOn: text.alternateOn,
            truncated: text.truncated,
            cursor: message.data.cursor,
          });
          sendWs(ws, buildEnvelope("screen.response", response, reqId));
          return;
        } catch {
          sendWs(
            ws,
            buildEnvelope(
              "screen.response",
              {
                ok: false,
                paneId: message.data.paneId,
                mode: "text",
                capturedAt: nowIso(),
                error: buildError("INTERNAL", "screen capture failed"),
              } as ScreenResponse,
              reqId,
            ),
          );
          return;
        }
      }

      if (config.readOnly) {
        sendWs(
          ws,
          buildEnvelope(
            "command.response",
            { ok: false, error: buildError("READ_ONLY", "read-only mode") },
            reqId,
          ),
        );
        return;
      }

      const clientKey = "ws";
      if (!sendLimiter(clientKey)) {
        sendWs(
          ws,
          buildEnvelope(
            "command.response",
            { ok: false, error: buildError("RATE_LIMIT", "rate limited") },
            reqId,
          ),
        );
        return;
      }

      if (message.type === "send.text") {
        const result = await tmuxActions.sendText(
          message.data.paneId,
          message.data.text,
          message.data.enter ?? true,
        );
        if (result.ok) {
          monitor.recordInput(message.data.paneId);
        }
        sendWs(ws, buildEnvelope("command.response", result as CommandResponse, reqId));
        return;
      }

      if (message.type === "send.keys") {
        const result = await tmuxActions.sendKeys(message.data.paneId, message.data.keys);
        if (result.ok) {
          monitor.recordInput(message.data.paneId);
        }
        sendWs(ws, buildEnvelope("command.response", result as CommandResponse, reqId));
        return;
      }
    },
  }));

  return { wsHandler, closeAllClients: closeAllWsClients };
};
