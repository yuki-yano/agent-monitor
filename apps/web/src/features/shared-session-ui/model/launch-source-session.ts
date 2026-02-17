import type { SessionSummary } from "@vde-monitor/shared";

import { isVwManagedWorktreePath } from "@/lib/session-format";

const isRepoRootPane = (session: SessionSummary) => {
  const repoRoot = session.repoRoot?.trim();
  const worktreePath = session.worktreePath?.trim();
  return Boolean(repoRoot && worktreePath && repoRoot === worktreePath);
};

export const selectLaunchSourceSession = (sessions: SessionSummary[]) => {
  if (sessions.length === 0) {
    return undefined;
  }
  return (
    sessions.find(isRepoRootPane) ??
    sessions.find((session) => !isVwManagedWorktreePath(session.worktreePath)) ??
    sessions.find((session) => session.paneActive) ??
    sessions[0]
  );
};
