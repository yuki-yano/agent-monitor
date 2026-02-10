import { setMapEntryWithLimit } from "../cache";
import { runGit } from "../git-utils";

const repoBranchCacheTtlMs = 3000;
const REPO_BRANCH_CACHE_MAX_ENTRIES = 1000;
const repoBranchCache = new Map<string, { branch: string | null; at: number }>();

const resolveRepoBranch = async (cwd: string | null) => {
  if (!cwd) return null;
  try {
    const output = await runGit(cwd, ["branch", "--show-current"], {
      timeoutMs: 2000,
      maxBuffer: 2_000_000,
      allowStdoutOnError: false,
    });
    const trimmed = output.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
};

export const resolveRepoBranchCached = async (cwd: string | null) => {
  if (!cwd) return null;
  const normalized = cwd.replace(/\/+$/, "");
  if (!normalized) return null;
  const nowMs = Date.now();
  const cached = repoBranchCache.get(normalized);
  if (cached && nowMs - cached.at < repoBranchCacheTtlMs) {
    return cached.branch;
  }
  const branch = await resolveRepoBranch(normalized);
  setMapEntryWithLimit(
    repoBranchCache,
    normalized,
    { branch, at: nowMs },
    REPO_BRANCH_CACHE_MAX_ENTRIES,
  );
  return branch;
};
