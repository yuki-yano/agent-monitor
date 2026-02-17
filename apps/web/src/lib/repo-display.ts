type FormatRepoDisplayNameOptions = {
  fallbackLabel?: string;
  stripTrailingSlash?: boolean;
  preferBasename?: boolean;
};

const DEFAULT_OPTIONS: Required<FormatRepoDisplayNameOptions> = {
  fallbackLabel: "No repo",
  stripTrailingSlash: true,
  preferBasename: true,
};

export const formatRepoDisplayName = (
  value: string | null,
  options?: FormatRepoDisplayNameOptions,
) => {
  const { fallbackLabel, stripTrailingSlash, preferBasename } = { ...DEFAULT_OPTIONS, ...options };
  if (!value) {
    return fallbackLabel;
  }
  const normalized = stripTrailingSlash ? value.replace(/\/+$/u, "") : value;
  if (!normalized) {
    return fallbackLabel;
  }
  if (!preferBasename) {
    return normalized;
  }
  const segments = normalized.split("/").filter(Boolean);
  const basename = segments[segments.length - 1] ?? normalized;
  return basename || fallbackLabel;
};
