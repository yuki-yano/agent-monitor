import {
  type CommitLog,
  defaultDangerCommandPatterns,
  type DiffSummary,
} from "@tmux-agent-monitor/shared";

export const stateTone = (state: string) => {
  switch (state) {
    case "RUNNING":
      return "running";
    case "WAITING_INPUT":
      return "waiting";
    case "WAITING_PERMISSION":
      return "permission";
    default:
      return "unknown";
  }
};

export const agentToneFor = (agent: string | null | undefined) => {
  switch (agent) {
    case "codex":
      return "codex" as const;
    case "claude":
      return "claude" as const;
    default:
      return "unknown" as const;
  }
};

export const agentLabelFor = (agent: string | null | undefined) => {
  switch (agent) {
    case "codex":
      return "CODEX";
    case "claude":
      return "CLAUDE";
    default:
      return "UNKNOWN";
  }
};

const compilePatterns = () =>
  defaultDangerCommandPatterns.map((pattern) => new RegExp(pattern, "i"));

export const AUTO_REFRESH_INTERVAL_MS = 10_000;
export const MAX_DIFF_LINES = 1200;
export const PREVIEW_DIFF_LINES = 240;
export const DISCONNECTED_MESSAGE = "Disconnected. Reconnecting...";
export const backLinkClass =
  "inline-flex items-center justify-center gap-2 rounded-full border border-latte-surface2 bg-transparent px-3 py-1.5 text-xs font-semibold text-latte-subtext0 transition hover:bg-latte-crust hover:text-latte-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-latte-lavender";

export const formatPath = (value: string | null) => {
  if (!value) return "—";
  const match = value.match(/^\/(Users|home)\/[^/]+(\/.*)?$/);
  if (match) {
    return `~${match[2] ?? ""}`;
  }
  return value;
};

export const formatRelativeTime = (value: string | null, nowMs: number) => {
  if (!value) return "-";
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return "-";
  const diffSec = Math.max(0, Math.floor((nowMs - ts) / 1000));
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d ago`;
};

export type LastInputTone = {
  pill: string;
  dot: string;
};

export const getLastInputTone = (value: string | null, nowMs: number): LastInputTone => {
  if (!value) {
    return {
      pill: "border-latte-surface2/70 bg-latte-crust/60 text-latte-subtext0",
      dot: "bg-latte-subtext0",
    };
  }
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) {
    return {
      pill: "border-latte-surface2/70 bg-latte-crust/60 text-latte-subtext0",
      dot: "bg-latte-subtext0",
    };
  }
  const diffSec = Math.max(0, Math.floor((nowMs - ts) / 1000));
  if (diffSec < 300) {
    return {
      pill: "border-latte-green/40 bg-latte-green/10 text-latte-green",
      dot: "bg-latte-green shadow-[0_0_8px_rgba(64,160,43,0.6)]",
    };
  }
  if (diffSec < 1800) {
    return {
      pill: "border-latte-yellow/40 bg-latte-yellow/10 text-latte-yellow",
      dot: "bg-latte-yellow shadow-[0_0_8px_rgba(223,142,29,0.6)]",
    };
  }
  if (diffSec < 7200) {
    return {
      pill: "border-latte-peach/40 bg-latte-peach/10 text-latte-peach",
      dot: "bg-latte-peach shadow-[0_0_8px_rgba(239,159,118,0.6)]",
    };
  }
  return {
    pill: "border-latte-red/40 bg-latte-red/10 text-latte-red",
    dot: "bg-latte-red shadow-[0_0_8px_rgba(210,15,57,0.6)]",
  };
};

export const isDangerousText = (text: string) => {
  const patterns = compilePatterns();
  const normalized = text.replace(/\r\n/g, "\n").split("\n");
  return normalized.some((line) =>
    patterns.some((pattern) => pattern.test(line.toLowerCase().replace(/\s+/g, " ").trim())),
  );
};

export const diffLineClass = (line: string) => {
  if (line.startsWith("+++ ") || line.startsWith("--- ")) {
    return "text-latte-subtext0 bg-latte-surface0/30";
  }
  if (line.startsWith("@@")) {
    return "text-latte-lavender bg-latte-lavender/10 font-semibold";
  }
  if (line.startsWith("+")) {
    return "text-latte-green bg-latte-green/15";
  }
  if (line.startsWith("-")) {
    return "text-latte-red bg-latte-red/15";
  }
  return "text-latte-text";
};

export const diffStatusClass = (status: string) => {
  switch (status) {
    case "A":
      return "text-latte-green";
    case "M":
      return "text-latte-yellow";
    case "D":
      return "text-latte-red";
    case "R":
    case "C":
      return "text-latte-lavender";
    case "U":
      return "text-latte-peach";
    default:
      return "text-latte-subtext0";
  }
};

export const formatTimestamp = (value: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

export const buildDiffSummarySignature = (summary: DiffSummary) => {
  const files = summary.files
    .map((file) => ({
      path: file.path,
      status: file.status,
      staged: file.staged,
      renamedFrom: file.renamedFrom ?? null,
      additions: file.additions ?? null,
      deletions: file.deletions ?? null,
    }))
    .sort((a, b) => {
      const pathCompare = a.path.localeCompare(b.path);
      if (pathCompare !== 0) return pathCompare;
      const statusCompare = a.status.localeCompare(b.status);
      if (statusCompare !== 0) return statusCompare;
      if (a.staged !== b.staged) return a.staged ? 1 : -1;
      return (a.renamedFrom ?? "").localeCompare(b.renamedFrom ?? "");
    });
  return JSON.stringify({
    repoRoot: summary.repoRoot ?? null,
    rev: summary.rev ?? null,
    truncated: summary.truncated ?? false,
    reason: summary.reason ?? null,
    files,
  });
};

export const buildCommitLogSignature = (log: CommitLog) =>
  JSON.stringify({
    repoRoot: log.repoRoot ?? null,
    rev: log.rev ?? null,
    reason: log.reason ?? null,
    totalCount: log.totalCount ?? null,
    commits: log.commits.map((commit) => commit.hash),
  });
