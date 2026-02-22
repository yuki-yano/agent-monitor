import { zValidator } from "@hono/zod-validator";
import type { UsageProviderId } from "@vde-monitor/shared";
import { Hono } from "hono";
import { z } from "zod";

import type { UsageDashboardService } from "../../domain/usage-dashboard/usage-dashboard-service";
import { buildError, nowIso } from "../helpers";
import type { GetLimiterKey, HeaderContext, Monitor } from "./types";

const usageDashboardQuerySchema = z.object({
  provider: z.enum(["codex", "claude", "cursor", "gemini", "unknown"]).optional(),
  refresh: z.string().optional(),
});

const usageTimelineQuerySchema = z.object({
  range: z.enum(["15m", "1h", "3h", "6h", "24h", "3d", "7d"]).optional(),
  limit: z.coerce.number().int().min(1).max(10_000).optional(),
});

const usageProviderQuerySchema = z.object({
  refresh: z.string().optional(),
});

const isRefreshRequested = (refresh: string | undefined) => refresh === "1";

const resolveGlobalTimelineRange = (range: string | undefined) => {
  if (
    range === "15m" ||
    range === "1h" ||
    range === "3h" ||
    range === "6h" ||
    range === "24h" ||
    range === "3d" ||
    range === "7d"
  ) {
    return range;
  }
  return "1h";
};

const applyRefreshRateLimit = ({
  c,
  forceRefresh,
  getLimiterKey,
  refreshLimiter,
}: {
  c: HeaderContext & { json: (body: unknown, status?: number) => Response };
  forceRefresh: boolean;
  getLimiterKey: GetLimiterKey;
  refreshLimiter: (key: string) => boolean;
}) => {
  if (!forceRefresh) {
    return null;
  }
  const limiterKey = `usage:${getLimiterKey(c)}`;
  if (refreshLimiter(limiterKey)) {
    return null;
  }
  return c.json(
    { error: buildError("RATE_LIMIT", "usage refresh is temporarily rate limited") },
    429,
  );
};

export const createUsageRoutes = ({
  monitor,
  usageDashboardService,
  getLimiterKey,
  refreshLimiter,
}: {
  monitor: Monitor;
  usageDashboardService: UsageDashboardService;
  getLimiterKey: GetLimiterKey;
  refreshLimiter: (key: string) => boolean;
}) => {
  return new Hono()
    .get("/usage/dashboard", zValidator("query", usageDashboardQuerySchema), async (c) => {
      const query = c.req.valid("query");
      const forceRefresh = isRefreshRequested(query.refresh);
      const rateLimitResponse = applyRefreshRateLimit({
        c,
        forceRefresh,
        getLimiterKey,
        refreshLimiter,
      });
      if (rateLimitResponse) {
        return rateLimitResponse;
      }

      try {
        const dashboard = await usageDashboardService.getDashboard({
          provider: query.provider as UsageProviderId | undefined,
          forceRefresh,
        });
        return c.json(dashboard);
      } catch {
        return c.json({ error: buildError("INTERNAL", "failed to load usage dashboard") }, 500);
      }
    })
    .get("/codex/usage", zValidator("query", usageProviderQuerySchema), async (c) => {
      const forceRefresh = isRefreshRequested(c.req.valid("query").refresh);
      const rateLimitResponse = applyRefreshRateLimit({
        c,
        forceRefresh,
        getLimiterKey,
        refreshLimiter,
      });
      if (rateLimitResponse) {
        return rateLimitResponse;
      }

      try {
        const provider = await usageDashboardService.getProviderSnapshot("codex", { forceRefresh });
        return c.json({
          provider,
          fetchedAt: nowIso(),
        });
      } catch {
        return c.json({ error: buildError("INTERNAL", "failed to load codex usage") }, 500);
      }
    })
    .get("/claude/usage", zValidator("query", usageProviderQuerySchema), async (c) => {
      const forceRefresh = isRefreshRequested(c.req.valid("query").refresh);
      const rateLimitResponse = applyRefreshRateLimit({
        c,
        forceRefresh,
        getLimiterKey,
        refreshLimiter,
      });
      if (rateLimitResponse) {
        return rateLimitResponse;
      }

      try {
        const provider = await usageDashboardService.getProviderSnapshot("claude", {
          forceRefresh,
        });
        return c.json({
          provider,
          fetchedAt: nowIso(),
        });
      } catch {
        return c.json({ error: buildError("INTERNAL", "failed to load claude usage") }, 500);
      }
    })
    .get("/usage/state-timeline", zValidator("query", usageTimelineQuerySchema), (c) => {
      const query = c.req.valid("query");
      const range = resolveGlobalTimelineRange(query.range);
      const timeline = monitor.getGlobalStateTimeline(range, query.limit);
      const sessions = monitor.registry.values();
      const activePaneCount = sessions.filter((session) => !session.paneDead).length;
      return c.json({
        timeline,
        paneCount: sessions.length,
        activePaneCount,
        fetchedAt: nowIso(),
      });
    });
};
