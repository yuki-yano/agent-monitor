import type { CommitFileDiff, CommitLog } from "@vde-monitor/shared";

export const formatCommitCountDescription = (commitLog: CommitLog | null) => {
  const currentCount = commitLog?.commits.length ?? 0;
  const totalCount = commitLog?.totalCount ?? currentCount;
  const suffix = totalCount === 1 ? "" : "s";
  return `${currentCount}/${totalCount} commit${suffix}`;
};

export const buildRenderedPatches = (
  commitFileOpen: Record<string, boolean>,
  commitFileDetails: Record<string, CommitFileDiff>,
) => {
  const next: Record<string, string[]> = {};
  Object.entries(commitFileOpen).forEach(([key, isOpen]) => {
    if (!isOpen) return;
    const patch = commitFileDetails[key]?.patch;
    if (!patch) return;
    next[key] = patch.split("\n");
  });
  return next;
};

export const isCommitListEmpty = (commitLog: CommitLog | null) => {
  if (!commitLog) return false;
  return commitLog.commits.length === 0 && !commitLog.reason;
};

export const shouldShowLoadMore = (commitLog: CommitLog | null, commitHasMore: boolean) => {
  if (!commitLog || commitLog.reason) return false;
  return commitHasMore;
};

export const getCommits = (commitLog: CommitLog | null) => commitLog?.commits ?? [];

export const buildCommitListClassName = (commitLoading: boolean) =>
  `relative ${commitLoading ? "min-h-[120px]" : ""}`;
