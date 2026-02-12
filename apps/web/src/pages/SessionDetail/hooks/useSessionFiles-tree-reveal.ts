import type { RepoFileTreePage } from "@vde-monitor/shared";
import { type Dispatch, type MutableRefObject, type SetStateAction, useCallback } from "react";

import { collectAncestorDirectories } from "./useSessionFiles-tree-utils";

type UseSessionFilesTreeRevealArgs = {
  repoRoot: string | null;
  treePagesRef: MutableRefObject<Record<string, RepoFileTreePage>>;
  loadTree: (targetPath: string, cursor?: string) => Promise<RepoFileTreePage | null>;
  setExpandedDirSet: Dispatch<SetStateAction<Set<string>>>;
};

export const useSessionFilesTreeReveal = ({
  repoRoot,
  treePagesRef,
  loadTree,
  setExpandedDirSet,
}: UseSessionFilesTreeRevealArgs) => {
  const loadTreeRemainingPages = useCallback(
    async (targetPath: string) => {
      if (!repoRoot) {
        return;
      }
      let page: RepoFileTreePage | null | undefined = treePagesRef.current[targetPath];
      if (!page) {
        page = await loadTree(targetPath);
      }
      while (page?.nextCursor) {
        const nextPage = await loadTree(targetPath, page.nextCursor);
        if (!nextPage) {
          return;
        }
        page = nextPage;
      }
    },
    [loadTree, repoRoot, treePagesRef],
  );

  const revealFilePath = useCallback(
    (targetPath: string) => {
      const ancestors = collectAncestorDirectories(targetPath);
      if (ancestors.length === 0) {
        return;
      }
      setExpandedDirSet((prev) => {
        const next = new Set(prev);
        ancestors.forEach((ancestor) => next.add(ancestor));
        return next;
      });
      ancestors.forEach((ancestor) => {
        const page = treePagesRef.current[ancestor];
        if (!page || page.nextCursor) {
          void loadTreeRemainingPages(ancestor);
        }
      });
    },
    [loadTreeRemainingPages, setExpandedDirSet, treePagesRef],
  );

  return {
    revealFilePath,
  };
};
