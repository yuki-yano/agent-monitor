import type { RepoFileSearchPage } from "@vde-monitor/shared";
import { useMemo } from "react";

import { buildSearchExpandPlan } from "../file-tree-search-expand";

type UseSessionFilesSearchExpandStateArgs = {
  searchResult: RepoFileSearchPage | null;
  searchActiveIndex: number;
  autoExpandMatchLimit: number;
  searchExpandedDirSet: Set<string>;
  searchCollapsedDirSet: Set<string>;
  searchQuery: string;
};

export const useSessionFilesSearchExpandState = ({
  searchResult,
  searchActiveIndex,
  autoExpandMatchLimit,
  searchExpandedDirSet,
  searchCollapsedDirSet,
  searchQuery,
}: UseSessionFilesSearchExpandStateArgs) => {
  const searchExpandPlan = useMemo(
    () =>
      buildSearchExpandPlan({
        matchedPaths: searchResult?.items.map((item) => item.path) ?? [],
        activeIndex: searchActiveIndex,
        autoExpandMatchLimit,
        truncated: searchResult?.truncated ?? false,
        totalMatchedCount: searchResult?.totalMatchedCount ?? 0,
      }),
    [autoExpandMatchLimit, searchActiveIndex, searchResult],
  );

  const effectiveSearchExpandedDirSet = useMemo(() => {
    const merged = new Set(searchExpandPlan.expandedDirSet);
    searchExpandedDirSet.forEach((path) => merged.add(path));
    searchCollapsedDirSet.forEach((path) => merged.delete(path));
    return merged;
  }, [searchCollapsedDirSet, searchExpandPlan.expandedDirSet, searchExpandedDirSet]);

  return {
    searchExpandPlan,
    effectiveSearchExpandedDirSet,
    isSearchActive: searchQuery.trim().length > 0,
  };
};
