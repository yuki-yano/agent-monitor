import type { SessionDetail, SessionSummary } from "@vde-monitor/shared";
import { useCallback, useState } from "react";

export const useSessionStore = () => {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);

  const applySessionsSnapshot = useCallback((nextSessions: SessionSummary[]) => {
    const unique = new Map<string, SessionSummary>();
    nextSessions.forEach((session) => {
      unique.set(session.paneId, session);
    });
    setSessions(Array.from(unique.values()));
  }, []);

  const updateSession = useCallback((session: SessionSummary) => {
    setSessions((prev) => {
      const next = new Map<string, SessionSummary>();
      prev.forEach((item) => next.set(item.paneId, item));
      next.set(session.paneId, session);
      return Array.from(next.values());
    });
  }, []);

  const removeSession = useCallback((paneId: string) => {
    setSessions((prev) => prev.filter((item) => item.paneId !== paneId));
  }, []);

  const getSessionDetail = useCallback(
    (paneId: string) => {
      const session = sessions.find((item) => item.paneId === paneId);
      return session ? (session as SessionDetail) : null;
    },
    [sessions],
  );

  return {
    sessions,
    setSessions,
    applySessionsSnapshot,
    updateSession,
    removeSession,
    getSessionDetail,
  };
};
