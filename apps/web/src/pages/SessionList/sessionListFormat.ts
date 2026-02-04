import { formatPath } from "@/lib/session-format";

export const formatRepoName = (value: string | null) => {
  if (!value) return "No repo";
  // パスの最後のセグメント（リポジトリ名）を取得
  const segments = value.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? "Unknown";
};

export const formatRepoPath = (value: string | null) => {
  if (!value) return null;
  return formatPath(value);
};
