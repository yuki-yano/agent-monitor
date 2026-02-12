import type { RepoFileSearchPage } from "@vde-monitor/shared";

import type { FileVisibilityPolicy } from "./file-visibility-policy";
import type { SearchIndexItem } from "./search-index-resolver";
import { normalizeSearchQuery } from "./service-context";
import { buildSortedSearchMatches } from "./service-search-matcher";
import { buildSearchPage } from "./service-search-page";
import { withServiceTimeout } from "./service-timeout";

type ExecuteSearchFilesArgs = {
  repoRoot: string;
  query: string;
  cursor?: string;
  limit: number;
  timeoutMs: number;
  resolveVisibilityPolicy: (repoRoot: string) => Promise<FileVisibilityPolicy>;
  resolveSearchIndex: (
    repoRoot: string,
    policy: FileVisibilityPolicy,
  ) => Promise<SearchIndexItem[]>;
};

export const executeSearchFiles = async ({
  repoRoot,
  query,
  cursor,
  limit,
  timeoutMs,
  resolveVisibilityPolicy,
  resolveSearchIndex,
}: ExecuteSearchFilesArgs): Promise<RepoFileSearchPage> => {
  const normalizedQuery = normalizeSearchQuery(query);
  const policy = await resolveVisibilityPolicy(repoRoot);
  const index = await withServiceTimeout(
    resolveSearchIndex(repoRoot, policy),
    timeoutMs,
    "search timed out",
  );
  const normalizedMatches = buildSortedSearchMatches(index, normalizedQuery);
  return buildSearchPage({
    query: normalizedQuery,
    matches: normalizedMatches,
    cursor,
    limit,
  });
};
