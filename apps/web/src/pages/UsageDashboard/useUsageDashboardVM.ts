import type {
  SessionStateTimelineRange,
  UsageDashboardResponse,
  UsageGlobalTimelineResponse,
} from "@vde-monitor/shared";
import { useCallback, useEffect, useState } from "react";

import { API_ERROR_MESSAGES } from "@/lib/api-messages";
import { useNowMs } from "@/lib/use-now-ms";
import { useVisibilityPolling } from "@/lib/use-visibility-polling";
import { useSessions } from "@/state/session-context";
import { useUsageApi } from "@/state/use-usage-api";

const DASHBOARD_POLL_INTERVAL_MS = 30_000;
const TIMELINE_POLL_INTERVAL_MS = 15_000;
const TIMELINE_DEFAULT_RANGE: SessionStateTimelineRange = "24h";

export const useUsageDashboardVM = () => {
  const { token, apiBaseUrl } = useSessions();
  const { requestUsageDashboard, requestUsageGlobalTimeline, resolveErrorMessage } = useUsageApi({
    token,
    apiBaseUrl,
  });

  const [dashboard, setDashboard] = useState<UsageDashboardResponse | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<UsageGlobalTimelineResponse | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [timelineRange, setTimelineRange] =
    useState<SessionStateTimelineRange>(TIMELINE_DEFAULT_RANGE);
  const [compactTimeline, setCompactTimeline] = useState(true);
  const nowMs = useNowMs(30_000);

  const canRequest = Boolean(token);

  const loadDashboard = useCallback(
    async ({
      forceRefresh = false,
      silent = false,
    }: {
      forceRefresh?: boolean;
      silent?: boolean;
    } = {}) => {
      if (!canRequest) {
        setDashboard(null);
        setDashboardError(API_ERROR_MESSAGES.missingToken);
        return;
      }
      if (!silent) {
        setDashboardLoading(true);
      }
      try {
        const next = await requestUsageDashboard({ refresh: forceRefresh });
        setDashboard(next);
        setDashboardError(null);
      } catch (error) {
        setDashboardError(resolveErrorMessage(error, API_ERROR_MESSAGES.usageDashboard));
      } finally {
        if (!silent) {
          setDashboardLoading(false);
        }
      }
    },
    [canRequest, requestUsageDashboard, resolveErrorMessage],
  );

  const loadTimeline = useCallback(
    async ({
      forceRefresh = false,
      silent = false,
      range,
    }: {
      forceRefresh?: boolean;
      silent?: boolean;
      range?: SessionStateTimelineRange;
    } = {}) => {
      if (!canRequest) {
        setTimeline(null);
        setTimelineError(API_ERROR_MESSAGES.missingToken);
        return;
      }
      const nextRange = range ?? timelineRange;
      if (!silent) {
        setTimelineLoading(true);
      }
      try {
        const next = await requestUsageGlobalTimeline({
          range: nextRange,
          refresh: forceRefresh,
        });
        setTimeline(next);
        setTimelineError(null);
      } catch (error) {
        setTimelineError(resolveErrorMessage(error, API_ERROR_MESSAGES.usageGlobalTimeline));
      } finally {
        if (!silent) {
          setTimelineLoading(false);
        }
      }
    },
    [canRequest, requestUsageGlobalTimeline, resolveErrorMessage, timelineRange],
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    void loadTimeline({ range: timelineRange });
  }, [loadTimeline, timelineRange]);

  useEffect(() => {
    if (timelineRange === "3d" || timelineRange === "7d") {
      setCompactTimeline(true);
    }
  }, [timelineRange]);

  useVisibilityPolling({
    enabled: canRequest,
    intervalMs: DASHBOARD_POLL_INTERVAL_MS,
    onTick: () => {
      void loadDashboard({ silent: true });
    },
    onResume: () => {
      void loadDashboard({ silent: true });
    },
  });

  useVisibilityPolling({
    enabled: canRequest,
    intervalMs: TIMELINE_POLL_INTERVAL_MS,
    onTick: () => {
      void loadTimeline({ silent: true });
    },
    onResume: () => {
      void loadTimeline({ silent: true });
    },
  });

  const refreshAll = useCallback(() => {
    void Promise.all([
      loadDashboard({ forceRefresh: true }),
      loadTimeline({ forceRefresh: true, range: timelineRange }),
    ]);
  }, [loadDashboard, loadTimeline, timelineRange]);

  return {
    dashboard,
    dashboardLoading,
    dashboardError,
    timeline,
    timelineLoading,
    timelineError,
    timelineRange,
    compactTimeline,
    nowMs,
    onTimelineRangeChange: setTimelineRange,
    onToggleCompactTimeline: () => {
      setCompactTimeline((current) => !current);
    },
    onRefreshAll: refreshAll,
  };
};

export type UsageDashboardVM = ReturnType<typeof useUsageDashboardVM>;
