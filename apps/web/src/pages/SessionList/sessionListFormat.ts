import { formatRepoDisplayName } from "@/lib/repo-display";
import { formatPath } from "@/lib/session-format";

export const formatRepoName = (value: string | null) => formatRepoDisplayName(value);

export const formatRepoPath = (value: string | null) => {
  if (!value) return null;
  return formatPath(value);
};
