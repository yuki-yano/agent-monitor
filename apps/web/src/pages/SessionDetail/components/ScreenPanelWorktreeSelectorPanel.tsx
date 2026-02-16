import type { WorktreeListEntry } from "@vde-monitor/shared";
import { Check, GitBranch, RefreshCw, X } from "lucide-react";

import { IconButton, TagPill, TruncatedSegmentText } from "@/components/ui";

import { formatBranchLabel } from "../sessionDetailUtils";
import {
  buildVisibleFileChangeCategories,
  formatGitMetric,
  formatRelativeWorktreePath,
  formatWorktreeFlag,
  hasWorktreeUpstreamDelta,
  resolveWorktreeFlagClassName,
  resolveWorktreePrStatus,
} from "./worktree-view-model";

type ScreenPanelWorktreeSelectorPanelProps = {
  entries: WorktreeListEntry[];
  worktreeRepoRoot: string | null;
  worktreeBaseBranch: string | null;
  virtualWorktreePath: string | null;
  actualWorktreePath: string | null;
  worktreeSelectorLoading: boolean;
  worktreeSelectorError: string | null;
  onRefresh: () => void;
  onClose: () => void;
  onSelectVirtualWorktree?: (path: string) => void;
};

export const ScreenPanelWorktreeSelectorPanel = ({
  entries,
  worktreeRepoRoot,
  worktreeBaseBranch,
  virtualWorktreePath,
  actualWorktreePath,
  worktreeSelectorLoading,
  worktreeSelectorError,
  onRefresh,
  onClose,
  onSelectVirtualWorktree,
}: ScreenPanelWorktreeSelectorPanelProps) => {
  const showBlockingWorktreeLoading = worktreeSelectorLoading && entries.length === 0;

  return (
    <div
      data-testid="worktree-selector-panel"
      className="border-latte-surface2/80 bg-latte-base/95 shadow-popover absolute left-0 top-[calc(100%+0.35rem)] z-[80] w-[min(88vw,420px)] rounded-xl border p-2 pt-9"
    >
      <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
        <IconButton
          type="button"
          size="xs"
          variant="base"
          aria-label="Reload worktrees"
          title="Reload worktrees"
          onClick={onRefresh}
        >
          <RefreshCw className="h-3 w-3" />
        </IconButton>
        <IconButton
          type="button"
          size="xs"
          variant="base"
          aria-label="Close worktree selector"
          title="Close worktree selector"
          onClick={onClose}
        >
          <X className="h-3 w-3" />
        </IconButton>
      </div>
      <div className="pointer-events-none absolute inset-x-2 top-1.5 flex h-6 items-center gap-1.5 pr-14">
        <GitBranch className="text-latte-subtext0 h-3 w-3 shrink-0" />
        <span className="text-latte-subtext0 text-[10px] font-semibold uppercase leading-none tracking-[0.14em]">
          Worktrees
        </span>
      </div>
      <div>
        {showBlockingWorktreeLoading ? (
          <p className="text-latte-subtext0 px-1 py-2 text-xs">Loading worktrees...</p>
        ) : null}
        {worktreeSelectorError ? (
          <p className="text-latte-red px-1 py-2 text-xs">{worktreeSelectorError}</p>
        ) : null}
        {!showBlockingWorktreeLoading && !worktreeSelectorError && entries.length === 0 ? (
          <p className="text-latte-subtext0 px-1 py-2 text-xs">No worktrees available.</p>
        ) : null}
        {!showBlockingWorktreeLoading && !worktreeSelectorError ? (
          <div className="custom-scrollbar max-h-[280px] space-y-1 overflow-y-auto pr-0.5">
            {entries.map((entry) => {
              const isVirtualSelected = entry.path === virtualWorktreePath;
              const isActualPath = entry.path === actualWorktreePath;
              const isRepoRootPath = worktreeRepoRoot != null && entry.path === worktreeRepoRoot;
              const isRepoRootDefaultBranch =
                isRepoRootPath &&
                worktreeBaseBranch != null &&
                entry.branch != null &&
                entry.branch === worktreeBaseBranch;
              const shouldShowMergedFlag = !isRepoRootDefaultBranch;
              const relativePath = formatRelativeWorktreePath(entry.path, worktreeRepoRoot);
              const shouldShowRelativePath = relativePath !== ".";
              const entryVisibleFileChangeCategories = buildVisibleFileChangeCategories(
                entry.fileChanges,
              );
              const entryAdditionsLabel = formatGitMetric(entry.additions ?? null);
              const entryDeletionsLabel = formatGitMetric(entry.deletions ?? null);
              const hasAhead = hasWorktreeUpstreamDelta(entry.ahead);
              const hasBehind = hasWorktreeUpstreamDelta(entry.behind);
              const shouldShowAheadBehind = !isRepoRootPath && (hasAhead || hasBehind);
              const entryBranchLabel = formatBranchLabel(entry.branch);
              const prStatus = resolveWorktreePrStatus(entry.prStatus ?? null);
              return (
                <button
                  key={entry.path}
                  type="button"
                  className={`hover:bg-latte-lavender/12 border-latte-surface2/70 flex w-full items-start justify-between gap-2 rounded-lg border px-2 py-1.5 text-left text-xs ${
                    isVirtualSelected ? "bg-latte-lavender/15 border-latte-lavender/50" : ""
                  }`}
                  onClick={() => {
                    if (!onSelectVirtualWorktree) {
                      return;
                    }
                    onSelectVirtualWorktree(entry.path);
                    onClose();
                  }}
                  disabled={!onSelectVirtualWorktree}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 flex-1 items-center gap-1.5">
                      <span className="text-latte-text min-w-0 flex-1 font-mono">
                        <TruncatedSegmentText
                          text={entryBranchLabel}
                          reservePx={8}
                          minVisibleSegments={2}
                          className="min-w-0 flex-1 text-left"
                        />
                      </span>
                      {isRepoRootPath ? (
                        <TagPill
                          tone="meta"
                          className="border-latte-blue/45 bg-latte-blue/10 text-latte-blue shrink-0 whitespace-nowrap px-1.5 py-[2px] text-[9px] font-semibold uppercase tracking-[0.08em]"
                        >
                          Repo Root
                        </TagPill>
                      ) : null}
                      <span className="flex shrink-0 items-center gap-1">
                        {entryVisibleFileChangeCategories.map((item) => (
                          <TagPill
                            key={`${entry.path}:${item.key}`}
                            tone="meta"
                            className={`${item.className} px-1.5 py-[2px] text-[9px] font-semibold uppercase tracking-[0.08em]`}
                          >
                            {item.label} {item.value}
                          </TagPill>
                        ))}
                        <span className="text-latte-green text-[10px] font-semibold">
                          +{entryAdditionsLabel}
                        </span>
                        <span className="text-latte-red text-[10px] font-semibold">
                          -{entryDeletionsLabel}
                        </span>
                      </span>
                    </span>
                    {shouldShowRelativePath ? (
                      <span
                        className="text-latte-subtext0 block truncate font-mono"
                        title={entry.path}
                      >
                        {relativePath}
                      </span>
                    ) : null}
                    {shouldShowAheadBehind ? (
                      <span className="mt-1 flex flex-wrap items-center gap-1">
                        {hasAhead ? (
                          <span className="border-latte-green/45 bg-latte-green/10 text-latte-green inline-flex items-center rounded-full border px-1.5 py-0.5 font-mono text-[9px]">
                            Ahead {entry.ahead}
                          </span>
                        ) : null}
                        {hasBehind ? (
                          <span className="border-latte-yellow/45 bg-latte-yellow/12 text-latte-yellow inline-flex items-center rounded-full border px-1.5 py-0.5 font-mono text-[9px]">
                            Behind {entry.behind}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                    <span className="mt-1 flex flex-wrap items-center gap-1">
                      <span
                        className={`inline-flex items-center rounded-full border px-1.5 py-0.5 font-mono text-[9px] ${resolveWorktreeFlagClassName("dirty", entry.dirty)}`}
                      >
                        Dirty {formatWorktreeFlag(entry.dirty)}
                      </span>
                      {!isRepoRootPath ? (
                        <span
                          className={`inline-flex items-center rounded-full border px-1.5 py-0.5 font-mono text-[9px] ${resolveWorktreeFlagClassName("locked", entry.locked)}`}
                        >
                          Locked {formatWorktreeFlag(entry.locked)}
                        </span>
                      ) : null}
                      {!isRepoRootPath ? (
                        <span
                          className={`inline-flex items-center rounded-full border px-1.5 py-0.5 font-mono text-[9px] ${prStatus.className}`}
                        >
                          {prStatus.label}
                        </span>
                      ) : null}
                      {shouldShowMergedFlag ? (
                        <span
                          className={`inline-flex items-center rounded-full border px-1.5 py-0.5 font-mono text-[9px] ${resolveWorktreeFlagClassName("merged", entry.merged)}`}
                        >
                          Merged {formatWorktreeFlag(entry.merged)}
                        </span>
                      ) : null}
                      {isActualPath ? (
                        <span className="border-latte-lavender/45 bg-latte-lavender/10 text-latte-lavender inline-flex items-center rounded-full border px-1.5 py-0.5 font-mono text-[9px]">
                          Current
                        </span>
                      ) : null}
                    </span>
                  </span>
                  {isVirtualSelected ? (
                    <Check className="text-latte-lavender mt-0.5 h-3.5 w-3.5 shrink-0" />
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
};
