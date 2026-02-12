import type { RepoFileSearchPage } from "@vde-monitor/shared";
import { type Dispatch, type MutableRefObject, type SetStateAction, useEffect } from "react";

import {
  applyEmptySearchState,
  createNextSearchRequestId,
  resetSearchExpandOverrides,
  scheduleSearchRequest,
} from "./useSessionFiles-search-effect";

type SetState<T> = Dispatch<SetStateAction<T>>;

type UseSessionFilesSearchEffectsArgs = {
  repoRoot: string | null;
  searchQuery: string;
  searchResult: RepoFileSearchPage | null;
  searchDebounceMs: number;
  activeSearchRequestIdRef: MutableRefObject<number>;
  fetchSearchPage: (query: string, cursor?: string) => Promise<RepoFileSearchPage>;
  resolveSearchErrorMessage: (error: unknown) => string;
  setSearchExpandedDirSet: SetState<Set<string>>;
  setSearchCollapsedDirSet: SetState<Set<string>>;
  setSearchResult: SetState<RepoFileSearchPage | null>;
  setSearchLoading: SetState<boolean>;
  setSearchError: SetState<string | null>;
  setSearchActiveIndex: SetState<number>;
};

export const useSessionFilesSearchEffects = ({
  repoRoot,
  searchQuery,
  searchResult,
  searchDebounceMs,
  activeSearchRequestIdRef,
  fetchSearchPage,
  resolveSearchErrorMessage,
  setSearchExpandedDirSet,
  setSearchCollapsedDirSet,
  setSearchResult,
  setSearchLoading,
  setSearchError,
  setSearchActiveIndex,
}: UseSessionFilesSearchEffectsArgs) => {
  useEffect(() => {
    if (!repoRoot) {
      return;
    }
    const normalized = searchQuery.trim();
    const requestId = createNextSearchRequestId(activeSearchRequestIdRef);
    resetSearchExpandOverrides({
      setSearchExpandedDirSet,
      setSearchCollapsedDirSet,
    });
    if (normalized.length === 0) {
      applyEmptySearchState({
        setSearchResult,
        setSearchError,
        setSearchLoading,
        setSearchActiveIndex,
      });
      return;
    }

    const timerId = scheduleSearchRequest({
      requestId,
      activeSearchRequestIdRef,
      normalizedQuery: normalized,
      debounceMs: searchDebounceMs,
      fetchSearchPage,
      resolveErrorMessage: resolveSearchErrorMessage,
      setSearchLoading,
      setSearchError,
      setSearchResult,
      setSearchActiveIndex,
    });

    return () => {
      window.clearTimeout(timerId);
    };
  }, [
    activeSearchRequestIdRef,
    fetchSearchPage,
    repoRoot,
    resolveSearchErrorMessage,
    searchDebounceMs,
    searchQuery,
    setSearchActiveIndex,
    setSearchCollapsedDirSet,
    setSearchError,
    setSearchExpandedDirSet,
    setSearchLoading,
    setSearchResult,
  ]);

  useEffect(() => {
    if (!searchResult) {
      return;
    }
    if (searchResult.items.length === 0) {
      setSearchActiveIndex(0);
      return;
    }
    setSearchActiveIndex((prev) => {
      if (prev < 0) {
        return 0;
      }
      if (prev >= searchResult.items.length) {
        return searchResult.items.length - 1;
      }
      return prev;
    });
  }, [searchResult, setSearchActiveIndex]);
};
