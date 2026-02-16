import { useCallback, useState } from "react";

import {
  DEFAULT_SESSION_LIST_FILTER,
  isSessionListFilter,
  type SessionListFilter,
} from "@/pages/SessionList/sessionListFilters";

type UseSessionSidebarActionsArgs = {
  onSelectSession?: (paneId: string) => void;
  onFocusPane?: (paneId: string) => Promise<void> | void;
  onLaunchAgentInSession?: (
    sessionName: string,
    agent: "codex" | "claude",
  ) => Promise<void> | void;
  onTouchSession?: (paneId: string) => void;
  onTouchRepoPin?: (repoRoot: string | null) => void;
};

export const useSessionSidebarActions = ({
  onSelectSession,
  onFocusPane,
  onLaunchAgentInSession,
  onTouchSession,
  onTouchRepoPin,
}: UseSessionSidebarActionsArgs) => {
  const [filter, setFilter] = useState<SessionListFilter>(DEFAULT_SESSION_LIST_FILTER);
  const [focusPendingPaneIds, setFocusPendingPaneIds] = useState<Set<string>>(() => new Set());
  const [launchPendingKeys, setLaunchPendingKeys] = useState<Set<string>>(() => new Set());

  const handleSelectSession = useCallback(
    (paneId: string) => {
      onSelectSession?.(paneId);
    },
    [onSelectSession],
  );

  const handleFocusPane = useCallback(
    async (paneId: string) => {
      if (!onFocusPane) {
        return;
      }
      setFocusPendingPaneIds((prev) => {
        if (prev.has(paneId)) {
          return prev;
        }
        const next = new Set(prev);
        next.add(paneId);
        return next;
      });
      try {
        await onFocusPane(paneId);
      } catch {
        // Best-effort UI action: ignore unexpected handler failures.
      } finally {
        setFocusPendingPaneIds((prev) => {
          if (!prev.has(paneId)) {
            return prev;
          }
          const next = new Set(prev);
          next.delete(paneId);
          return next;
        });
      }
    },
    [onFocusPane],
  );

  const handleLaunchAgentInSession = useCallback(
    async (sessionName: string, agent: "codex" | "claude") => {
      if (!onLaunchAgentInSession) {
        return;
      }
      const launchKey = `${sessionName}:${agent}`;
      setLaunchPendingKeys((prev) => {
        if (prev.has(launchKey)) {
          return prev;
        }
        const next = new Set(prev);
        next.add(launchKey);
        return next;
      });
      try {
        await onLaunchAgentInSession(sessionName, agent);
      } catch {
        // Best-effort UI action: ignore unexpected handler failures.
      } finally {
        setLaunchPendingKeys((prev) => {
          if (!prev.has(launchKey)) {
            return prev;
          }
          const next = new Set(prev);
          next.delete(launchKey);
          return next;
        });
      }
    },
    [onLaunchAgentInSession],
  );

  const handleFilterChange = useCallback((next: string) => {
    if (!isSessionListFilter(next)) {
      setFilter(DEFAULT_SESSION_LIST_FILTER);
      return;
    }
    setFilter(next);
  }, []);

  const handleTouchRepoPin = useCallback(
    (repoRoot: string | null) => {
      onTouchRepoPin?.(repoRoot);
    },
    [onTouchRepoPin],
  );

  const handleTouchPane = useCallback(
    (paneId: string) => {
      onTouchSession?.(paneId);
    },
    [onTouchSession],
  );

  return {
    filter,
    focusPendingPaneIds,
    launchPendingKeys,
    handleSelectSession,
    handleFocusPane,
    handleLaunchAgentInSession,
    handleFilterChange,
    handleTouchRepoPin,
    handleTouchPane,
  };
};
