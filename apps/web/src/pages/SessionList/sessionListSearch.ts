import type { SessionSummary } from "@vde-monitor/shared";

type SessionListSearchTarget = Pick<
  SessionSummary,
  "customTitle" | "title" | "sessionName" | "repoRoot" | "currentPath" | "branch" | "paneId"
>;

export const normalizeSessionListSearchQuery = (value: unknown) => {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
};

export const matchesSessionListSearch = (session: SessionListSearchTarget, query: string) => {
  const normalizedQuery = normalizeSessionListSearchQuery(query).toLowerCase();
  if (normalizedQuery.length === 0) {
    return true;
  }

  return [
    session.customTitle,
    session.title,
    session.sessionName,
    session.repoRoot,
    session.currentPath,
    session.branch,
    session.paneId,
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .some((value) => value.toLowerCase().includes(normalizedQuery));
};
