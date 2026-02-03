import type {
  CommitDetail,
  CommitFile,
  CommitFileDiff,
  CommitLog,
  CommitSummary,
} from "@vde-monitor/shared";

import { isBinaryPatch, parseNumstat, pickStatus } from "./git-parsers.js";
import { resolveRepoRoot, runGit } from "./git-utils.js";

const LOG_TTL_MS = 3000;
const DETAIL_TTL_MS = 3000;
const FILE_TTL_MS = 3000;
const MAX_PATCH_BYTES = 2_000_000;

const RECORD_SEPARATOR = "\u001e";
const FIELD_SEPARATOR = "\u001f";

const nowIso = () => new Date().toISOString();

const logCache = new Map<
  string,
  { at: number; rev: string | null; log: CommitLog; signature: string }
>();
const detailCache = new Map<string, { at: number; detail: CommitDetail }>();
const fileCache = new Map<string, { at: number; file: CommitFileDiff }>();

const resolveHead = async (repoRoot: string) => {
  try {
    const output = await runGit(repoRoot, ["rev-parse", "HEAD"]);
    const trimmed = output.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
};

const resolveCommitCount = async (repoRoot: string) => {
  try {
    const output = await runGit(repoRoot, ["rev-list", "--count", "HEAD"]);
    const trimmed = output.trim();
    if (!trimmed) return null;
    const count = Number.parseInt(trimmed, 10);
    return Number.isFinite(count) ? count : null;
  } catch {
    return null;
  }
};

export const parseCommitLogOutput = (output: string): CommitSummary[] => {
  if (!output) return [];
  const records = output.split(RECORD_SEPARATOR).filter((record) => record.trim().length > 0);
  const commits: CommitSummary[] = [];
  for (const record of records) {
    const fields = record.split(FIELD_SEPARATOR);
    const [
      hash = "",
      shortHash = "",
      authorName = "",
      authorEmailRaw = "",
      authoredAt = "",
      subject = "",
      bodyRaw = "",
    ] = fields;
    if (!hash) {
      continue;
    }
    const body = bodyRaw.trim().length > 0 ? bodyRaw : null;
    const authorEmail = authorEmailRaw.trim().length > 0 ? authorEmailRaw : null;
    commits.push({
      hash,
      shortHash,
      subject,
      body,
      authorName,
      authorEmail,
      authoredAt,
    });
  }
  return commits;
};

export const parseNameStatusOutput = (output: string): CommitFile[] => {
  const files: CommitFile[] = [];
  const lines = output.split("\n").filter((line) => line.trim().length > 0);
  for (const line of lines) {
    const parts = line.split("\t");
    if (parts.length < 2) {
      continue;
    }
    const statusRaw = parts[0] ?? "";
    const status = pickStatus(statusRaw);
    if (status === "R" || status === "C") {
      if (parts.length >= 3) {
        files.push({
          status,
          renamedFrom: parts[1] ?? undefined,
          path: parts[2] ?? parts[1] ?? "",
          additions: null,
          deletions: null,
        });
      }
      continue;
    }
    files.push({
      status,
      path: parts[1] ?? "",
      additions: null,
      deletions: null,
    });
  }
  return files.filter((file) => file.path.length > 0);
};

const findStatForFile = (
  stats: Map<string, { additions: number | null; deletions: number | null }>,
  file: CommitFile,
) => {
  const direct = stats.get(file.path);
  if (direct) {
    return direct;
  }
  if (file.renamedFrom) {
    const renameDirect = stats.get(file.renamedFrom);
    if (renameDirect) {
      return renameDirect;
    }
  }
  for (const [key, value] of stats.entries()) {
    if (file.renamedFrom && key.includes(file.renamedFrom) && key.includes(file.path)) {
      return value;
    }
    if (key.includes(file.path)) {
      return value;
    }
  }
  return null;
};

const buildCommitLogSignature = (log: CommitLog) => {
  return JSON.stringify({
    repoRoot: log.repoRoot ?? null,
    rev: log.rev ?? null,
    reason: log.reason ?? null,
    commits: log.commits.map((commit) => commit.hash),
  });
};

export const fetchCommitLog = async (
  cwd: string | null,
  options?: { limit?: number; skip?: number; force?: boolean },
): Promise<CommitLog> => {
  if (!cwd) {
    return {
      repoRoot: null,
      rev: null,
      generatedAt: nowIso(),
      commits: [],
      reason: "cwd_unknown",
    };
  }
  const repoRoot = await resolveRepoRoot(cwd);
  if (!repoRoot) {
    return {
      repoRoot: null,
      rev: null,
      generatedAt: nowIso(),
      commits: [],
      reason: "not_git",
    };
  }
  const limit = Math.max(1, Math.min(options?.limit ?? 10, 50));
  const skip = Math.max(0, options?.skip ?? 0);
  const head = await resolveHead(repoRoot);
  const cacheKey = `${repoRoot}:${limit}:${skip}`;
  const cached = logCache.get(cacheKey);
  const nowMs = Date.now();
  if (!options?.force && cached && nowMs - cached.at < LOG_TTL_MS && cached.rev === head) {
    return cached.log;
  }
  const totalCount = head ? await resolveCommitCount(repoRoot) : 0;
  try {
    const format = [
      RECORD_SEPARATOR,
      "%H",
      FIELD_SEPARATOR,
      "%h",
      FIELD_SEPARATOR,
      "%an",
      FIELD_SEPARATOR,
      "%ae",
      FIELD_SEPARATOR,
      "%ad",
      FIELD_SEPARATOR,
      "%s",
      FIELD_SEPARATOR,
      "%b",
    ].join("");
    const output = await runGit(repoRoot, [
      "log",
      "-n",
      String(limit),
      "--skip",
      String(skip),
      "--date=iso-strict",
      `--format=${format}`,
    ]);
    const commits = parseCommitLogOutput(output);
    const log: CommitLog = {
      repoRoot,
      rev: head,
      generatedAt: nowIso(),
      commits,
      totalCount,
    };
    logCache.set(cacheKey, {
      at: nowMs,
      rev: head,
      log,
      signature: buildCommitLogSignature(log),
    });
    return log;
  } catch {
    return {
      repoRoot,
      rev: head,
      generatedAt: nowIso(),
      commits: [],
      totalCount,
      reason: "error",
    };
  }
};

export const fetchCommitDetail = async (
  repoRoot: string,
  hash: string,
  options?: { force?: boolean },
): Promise<CommitDetail | null> => {
  const cacheKey = `${repoRoot}:${hash}`;
  const cached = detailCache.get(cacheKey);
  const nowMs = Date.now();
  if (!options?.force && cached && nowMs - cached.at < DETAIL_TTL_MS) {
    return cached.detail;
  }
  try {
    const format = [
      RECORD_SEPARATOR,
      "%H",
      FIELD_SEPARATOR,
      "%h",
      FIELD_SEPARATOR,
      "%an",
      FIELD_SEPARATOR,
      "%ae",
      FIELD_SEPARATOR,
      "%ad",
      FIELD_SEPARATOR,
      "%s",
      FIELD_SEPARATOR,
      "%b",
    ].join("");
    const metaOutput = await runGit(repoRoot, [
      "show",
      "-s",
      "--date=iso-strict",
      `--format=${format}`,
      hash,
    ]);
    const meta = parseCommitLogOutput(metaOutput)[0];
    if (!meta) {
      return null;
    }
    const nameStatusOutput = await runGit(repoRoot, ["show", "--name-status", "--format=", hash]);
    const numstatOutput = await runGit(repoRoot, ["show", "--numstat", "--format=", hash]);
    const files = parseNameStatusOutput(nameStatusOutput);
    const stats = parseNumstat(numstatOutput);
    const withStats = files.map((file) => {
      const stat = findStatForFile(stats, file);
      return {
        ...file,
        additions: stat?.additions ?? null,
        deletions: stat?.deletions ?? null,
      };
    });
    const detail: CommitDetail = {
      ...meta,
      files: withStats,
    };
    detailCache.set(cacheKey, { at: nowMs, detail });
    return detail;
  } catch {
    return null;
  }
};

export const fetchCommitFile = async (
  repoRoot: string,
  hash: string,
  file: CommitFile,
  options?: { force?: boolean },
): Promise<CommitFileDiff> => {
  const cacheKey = `${repoRoot}:${hash}:${file.path}`;
  const cached = fileCache.get(cacheKey);
  const nowMs = Date.now();
  if (!options?.force && cached && nowMs - cached.at < FILE_TTL_MS) {
    return cached.file;
  }
  let patch = "";
  try {
    patch = await runGit(repoRoot, ["show", "--find-renames", "--format=", hash, "--", file.path]);
    if (!patch && file.renamedFrom) {
      patch = await runGit(repoRoot, [
        "show",
        "--find-renames",
        "--format=",
        hash,
        "--",
        file.renamedFrom,
      ]);
    }
  } catch {
    patch = "";
  }
  const binary = isBinaryPatch(patch) || file.additions === null || file.deletions === null;
  let truncated = false;
  if (patch.length > MAX_PATCH_BYTES) {
    truncated = true;
    patch = patch.slice(0, MAX_PATCH_BYTES);
  }
  const diff: CommitFileDiff = {
    path: file.path,
    status: file.status,
    patch: patch.length > 0 ? patch : null,
    binary,
    truncated,
  };
  fileCache.set(cacheKey, { at: nowMs, file: diff });
  return diff;
};
