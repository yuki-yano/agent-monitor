import type { RepoFileTreePage } from "@vde-monitor/shared";
import { type Dispatch, type MutableRefObject, type SetStateAction, useCallback } from "react";

import { resolveTreeLoadMoreTarget } from "./session-files-tree-utils";

type UseSessionFilesTreeActionsArgs = {
  isSearchActive: boolean;
  effectiveSearchExpandedDirSet: Set<string>;
  expandedDirSet: Set<string>;
  treePages: Record<string, RepoFileTreePage>;
  setSearchExpandedDirSet: Dispatch<SetStateAction<Set<string>>>;
  setSearchCollapsedDirSet: Dispatch<SetStateAction<Set<string>>>;
  setExpandedDirSet: Dispatch<SetStateAction<Set<string>>>;
  treePagesRef: MutableRefObject<Record<string, RepoFileTreePage>>;
  loadTree: (targetPath: string, cursor?: string) => Promise<RepoFileTreePage | null>;
};

export const useSessionFilesTreeActions = ({
  isSearchActive,
  effectiveSearchExpandedDirSet,
  expandedDirSet,
  treePages,
  setSearchExpandedDirSet,
  setSearchCollapsedDirSet,
  setExpandedDirSet,
  treePagesRef,
  loadTree,
}: UseSessionFilesTreeActionsArgs) => {
  const onToggleDirectory = useCallback(
    (targetPath: string) => {
      if (isSearchActive) {
        const isExpanded = effectiveSearchExpandedDirSet.has(targetPath);
        if (isExpanded) {
          setSearchExpandedDirSet((prev) => {
            const next = new Set(prev);
            next.delete(targetPath);
            return next;
          });
          setSearchCollapsedDirSet((prev) => {
            const next = new Set(prev);
            next.add(targetPath);
            return next;
          });
          return;
        }
        setSearchCollapsedDirSet((prev) => {
          const next = new Set(prev);
          next.delete(targetPath);
          return next;
        });
        setSearchExpandedDirSet((prev) => {
          const next = new Set(prev);
          next.add(targetPath);
          return next;
        });
        return;
      }

      const alreadyExpanded = expandedDirSet.has(targetPath);
      setExpandedDirSet((prev) => {
        const next = new Set(prev);
        if (next.has(targetPath)) {
          next.delete(targetPath);
          return next;
        }
        next.add(targetPath);
        return next;
      });
      if (!alreadyExpanded && !treePagesRef.current[targetPath]) {
        void loadTree(targetPath);
      }
    },
    [
      effectiveSearchExpandedDirSet,
      expandedDirSet,
      isSearchActive,
      loadTree,
      setExpandedDirSet,
      setSearchCollapsedDirSet,
      setSearchExpandedDirSet,
      treePagesRef,
    ],
  );

  const onLoadMoreTreeRoot = useCallback(() => {
    const target = resolveTreeLoadMoreTarget({
      treePages,
      expandedDirSet,
    });
    if (!target) {
      return;
    }
    void loadTree(target.path, target.cursor);
  }, [expandedDirSet, loadTree, treePages]);

  return {
    onToggleDirectory,
    onLoadMoreTreeRoot,
  };
};
