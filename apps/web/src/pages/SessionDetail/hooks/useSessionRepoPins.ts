import type { SessionSummary } from "@vde-monitor/shared";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createRepoPinKey,
  readStoredSessionListPins,
  storeSessionListPins,
  touchSessionListPin,
} from "@/features/shared-session-ui/model/session-list-pins";
import { buildSessionGroups } from "@/lib/session-group";

type UseSessionRepoPinsArgs = {
  sessions: SessionSummary[];
};

export const useSessionRepoPins = ({ sessions }: UseSessionRepoPinsArgs) => {
  const [pins, setPins] = useState(() => readStoredSessionListPins());
  const repoPinValues = pins.repos;

  useEffect(() => {
    storeSessionListPins(pins);
  }, [pins]);

  const getRepoSortAnchorAt = useCallback(
    (repoRoot: string | null) => repoPinValues[createRepoPinKey(repoRoot)] ?? null,
    [repoPinValues],
  );
  const paneRepoRootMap = useMemo(
    () =>
      new Map(
        sessions.map((sessionItem) => [sessionItem.paneId, sessionItem.repoRoot ?? null] as const),
      ),
    [sessions],
  );
  const touchRepoSortAnchor = useCallback((repoRoot: string | null) => {
    setPins((prev) => touchSessionListPin(prev, "repos", createRepoPinKey(repoRoot)));
  }, []);
  const sessionGroups = useMemo(
    () => buildSessionGroups(sessions, { getRepoSortAnchorAt }),
    [sessions, getRepoSortAnchorAt],
  );

  return {
    getRepoSortAnchorAt,
    paneRepoRootMap,
    touchRepoSortAnchor,
    sessionGroups,
  };
};
