import path from "node:path";

export const normalizeAbsolutePath = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }
  const resolved = path.resolve(value);
  const normalized = resolved.replace(/[\\/]+$/, "");
  if (normalized.length > 0) {
    return normalized;
  }
  return path.sep;
};
