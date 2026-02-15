import { execa } from "execa";

import { setMapEntryWithLimit } from "../cache";

const prCreatedCacheTtlMs = 60_000;
const PR_CREATED_CACHE_MAX_ENTRIES = 1000;
const PR_CREATED_BATCH_LIMIT = "1000";

type PrCreatedSnapshot = {
  at: number;
  branches: Set<string> | null;
};

const prCreatedCache = new Map<string, PrCreatedSnapshot>();
const inflight = new Map<string, Promise<PrCreatedSnapshot>>();

const parsePrCreatedBranches = (stdout: string): Set<string> | null => {
  if (!stdout.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(stdout) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }
    const branches = new Set<string>();
    parsed.forEach((entry) => {
      if (!entry || typeof entry !== "object") {
        return;
      }
      const headRefName = (entry as { headRefName?: unknown }).headRefName;
      if (typeof headRefName !== "string" || headRefName.length === 0) {
        return;
      }
      branches.add(headRefName);
    });
    return branches;
  } catch {
    return null;
  }
};

const fetchPrCreatedSnapshot = async (repoRoot: string): Promise<Set<string> | null> => {
  try {
    const result = await execa(
      "gh",
      ["pr", "list", "--state", "all", "--limit", PR_CREATED_BATCH_LIMIT, "--json", "headRefName"],
      {
        cwd: repoRoot,
        reject: false,
        timeout: 5000,
        maxBuffer: 1_000_000,
      },
    );
    if (result.exitCode !== 0) {
      return null;
    }
    return parsePrCreatedBranches(result.stdout);
  } catch {
    return null;
  }
};

const resolvePrCreatedFromSnapshot = (
  snapshot: PrCreatedSnapshot,
  branch: string,
): boolean | null => {
  if (!snapshot.branches) {
    return null;
  }
  return snapshot.branches.has(branch);
};

export const resolvePrCreatedCached = async (
  repoRoot: string | null,
  branch: string | null,
): Promise<boolean | null> => {
  if (!repoRoot || !branch) {
    return null;
  }
  const nowMs = Date.now();
  const cached = prCreatedCache.get(repoRoot);
  if (cached && nowMs - cached.at < prCreatedCacheTtlMs) {
    return resolvePrCreatedFromSnapshot(cached, branch);
  }
  const existing = inflight.get(repoRoot);
  if (existing) {
    return existing.then((snapshot) => resolvePrCreatedFromSnapshot(snapshot, branch));
  }
  const request = fetchPrCreatedSnapshot(repoRoot).then((branches) => {
    const snapshot: PrCreatedSnapshot = { at: Date.now(), branches };
    setMapEntryWithLimit(prCreatedCache, repoRoot, snapshot, PR_CREATED_CACHE_MAX_ENTRIES);
    inflight.delete(repoRoot);
    return snapshot;
  });
  inflight.set(repoRoot, request);
  return request.then((snapshot) => resolvePrCreatedFromSnapshot(snapshot, branch));
};
