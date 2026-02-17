import type { SessionSummary } from "@vde-monitor/shared";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createRepoPinKey,
  readStoredSessionListPins,
  storeSessionListPins,
  touchSessionListPin,
} from "@/features/shared-session-ui/model/session-list-pins";

type UseSessionListPinsArgs = {
  sessions: SessionSummary[];
  onTouchPane?: (paneId: string) => Promise<void> | void;
};

export const useSessionListPins = ({ sessions, onTouchPane }: UseSessionListPinsArgs) => {
  const [pins, setPins] = useState(() => readStoredSessionListPins());
  const repoPinValues = pins.repos;

  useEffect(() => {
    storeSessionListPins(pins);
  }, [pins]);

  const paneRepoRootMap = useMemo(
    () => new Map(sessions.map((session) => [session.paneId, session.repoRoot ?? null] as const)),
    [sessions],
  );

  const getRepoSortAnchorAt = useCallback(
    (repoRoot: string | null) => repoPinValues[createRepoPinKey(repoRoot)] ?? null,
    [repoPinValues],
  );

  const touchRepoPin = useCallback((repoRoot: string | null) => {
    setPins((prev) => touchSessionListPin(prev, "repos", createRepoPinKey(repoRoot)));
  }, []);

  const touchPanePin = useCallback(
    (paneId: string) => {
      if (paneRepoRootMap.has(paneId)) {
        const repoRoot = paneRepoRootMap.get(paneId) ?? null;
        setPins((prev) => touchSessionListPin(prev, "repos", createRepoPinKey(repoRoot)));
      }
      if (!onTouchPane) {
        return;
      }
      try {
        const result = onTouchPane(paneId);
        void Promise.resolve(result).catch(() => null);
      } catch {
        // Best-effort UI action: ignore unexpected callback failures.
      }
    },
    [onTouchPane, paneRepoRootMap],
  );

  return {
    pins,
    paneRepoRootMap,
    getRepoSortAnchorAt,
    touchRepoPin,
    touchPanePin,
  };
};
