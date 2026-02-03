import type { DiffFileStatus } from "@vde-monitor/shared";

export const pickStatus = (value: string): DiffFileStatus => {
  const allowed: DiffFileStatus[] = ["A", "M", "D", "R", "C", "U", "?"];
  const status = value.toUpperCase().slice(0, 1);
  return allowed.includes(status as DiffFileStatus) ? (status as DiffFileStatus) : "?";
};

export const isBinaryPatch = (patch: string) => {
  const binaryPattern = /^(Binary files |GIT binary patch$|literal \d+|delta \d+)/m;
  return binaryPattern.test(patch);
};

export const parseNumstat = (output: string) => {
  const stats = new Map<string, { additions: number | null; deletions: number | null }>();
  const lines = output.split("\n").filter((line) => line.trim().length > 0);
  for (const line of lines) {
    const parts = line.split("\t");
    if (parts.length < 3) {
      continue;
    }
    const addRaw = parts[0] ?? "";
    const delRaw = parts[1] ?? "";
    const pathValue = parts[parts.length - 1] ?? "";
    const additions = addRaw === "-" ? null : Number.parseInt(addRaw, 10);
    const deletions = delRaw === "-" ? null : Number.parseInt(delRaw, 10);
    stats.set(pathValue, {
      additions: Number.isFinite(additions) ? additions : null,
      deletions: Number.isFinite(deletions) ? deletions : null,
    });
  }
  return stats;
};

export const parseNumstatLine = (output: string) => {
  const line = output
    .split("\n")
    .map((value) => value.trim())
    .find((value) => value.length > 0);
  if (!line) {
    return null;
  }
  const parts = line.split("\t");
  if (parts.length < 2) {
    return null;
  }
  const addRaw = parts[0] ?? "";
  const delRaw = parts[1] ?? "";
  const additions = addRaw === "-" ? null : Number.parseInt(addRaw, 10);
  const deletions = delRaw === "-" ? null : Number.parseInt(delRaw, 10);
  return {
    additions: Number.isFinite(additions) ? additions : null,
    deletions: Number.isFinite(deletions) ? deletions : null,
  };
};
