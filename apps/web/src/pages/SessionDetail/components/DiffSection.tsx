import { type DiffFile, type DiffSummary } from "@tmux-agent-monitor/shared";
import { ChevronDown, ChevronUp, FileCheck, RefreshCw } from "lucide-react";
import { memo, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import {
  diffLineClass,
  diffStatusClass,
  formatPath,
  MAX_DIFF_LINES,
  PREVIEW_DIFF_LINES,
} from "../sessionDetailUtils";

type DiffSectionProps = {
  diffSummary: DiffSummary | null;
  diffError: string | null;
  diffLoading: boolean;
  diffFiles: Record<string, DiffFile>;
  diffOpen: Record<string, boolean>;
  diffLoadingFiles: Record<string, boolean>;
  onRefresh: () => void;
  onToggle: (path: string) => void;
};

export const DiffSection = memo(
  ({
    diffSummary,
    diffError,
    diffLoading,
    diffFiles,
    diffOpen,
    diffLoadingFiles,
    onRefresh,
    onToggle,
  }: DiffSectionProps) => {
    const [expandedDiffs, setExpandedDiffs] = useState<Record<string, boolean>>({});
    const totals = useMemo(() => {
      if (!diffSummary) return null;
      if (diffSummary.files.length === 0) {
        return { additions: 0, deletions: 0, total: 0 };
      }
      let additions = 0;
      let deletions = 0;
      let hasTotals = false;
      diffSummary.files.forEach((file) => {
        if (typeof file.additions === "number") {
          additions += file.additions;
          hasTotals = true;
        }
        if (typeof file.deletions === "number") {
          deletions += file.deletions;
          hasTotals = true;
        }
      });
      if (!hasTotals) return null;
      return { additions, deletions, total: additions + deletions };
    }, [diffSummary]);
    const totalLabel = totals ? `${totals.total} line${totals.total === 1 ? "" : "s"}` : "—";

    useEffect(() => {
      if (!diffSummary?.files.length) {
        setExpandedDiffs({});
        return;
      }
      const fileSet = new Set(diffSummary.files.map((file) => file.path));
      setExpandedDiffs((prev) => {
        const next: Record<string, boolean> = {};
        Object.entries(prev).forEach(([path, value]) => {
          if (fileSet.has(path)) {
            next[path] = value;
          }
        });
        return next;
      });
    }, [diffSummary]);

    const handleExpandDiff = useCallback((path: string) => {
      setExpandedDiffs((prev) => (prev[path] ? prev : { ...prev, [path]: true }));
    }, []);

    const renderedPatches = useMemo<
      Record<
        string,
        {
          nodes: ReactNode;
          truncated: boolean;
          totalLines: number;
          previewLines: number;
        }
      >
    >(() => {
      const entries = Object.entries(diffOpen);
      if (entries.length === 0) {
        return {};
      }
      const next: Record<
        string,
        { nodes: ReactNode; truncated: boolean; totalLines: number; previewLines: number }
      > = {};
      entries.forEach(([path, isOpen]) => {
        if (!isOpen) return;
        const file = diffFiles[path];
        if (!file?.patch) return;
        const lines = file.patch.split("\n");
        const totalLines = lines.length;
        const shouldTruncate = totalLines > MAX_DIFF_LINES && !expandedDiffs[path];
        const visibleLines = shouldTruncate ? lines.slice(0, PREVIEW_DIFF_LINES) : lines;
        next[path] = {
          nodes: visibleLines.map((line, index) => (
            <div
              key={`${index}-${line.slice(0, 12)}`}
              className={`${diffLineClass(line)} -mx-2 block w-full rounded-sm px-2`}
            >
              {line || " "}
            </div>
          )),
          truncated: shouldTruncate,
          totalLines,
          previewLines: visibleLines.length,
        };
      });
      return next;
    }, [diffFiles, diffOpen, expandedDiffs]);

    return (
      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-latte-text text-base font-semibold tracking-tight">
              Changes
            </h2>
            <p className="text-latte-text text-sm">
              {diffSummary?.files.length ?? 0} file
              {(diffSummary?.files.length ?? 0) === 1 ? "" : "s"}
              {diffSummary && (
                <span className="ml-2 inline-flex items-center gap-2 text-xs">
                  <span className="text-latte-green">+{totals?.additions ?? "—"}</span>
                  <span className="text-latte-red">-{totals?.deletions ?? "—"}</span>
                  <span className="text-latte-subtext0">{totalLabel}</span>
                </span>
              )}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={diffLoading}
            aria-label="Refresh changes"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="sr-only">Refresh</span>
          </Button>
        </div>
        {diffSummary?.repoRoot && (
          <p className="text-latte-subtext0 text-xs">Repo: {formatPath(diffSummary.repoRoot)}</p>
        )}
        {diffSummary?.reason === "cwd_unknown" && (
          <div className="border-latte-peach/40 bg-latte-peach/10 text-latte-peach rounded-2xl border px-4 py-2 text-xs">
            Working directory is unknown for this session.
          </div>
        )}
        {diffSummary?.reason === "not_git" && (
          <div className="border-latte-peach/40 bg-latte-peach/10 text-latte-peach rounded-2xl border px-4 py-2 text-xs">
            Current directory is not a git repository.
          </div>
        )}
        {diffSummary?.reason === "error" && (
          <div className="border-latte-red/40 bg-latte-red/10 text-latte-red rounded-2xl border px-4 py-2 text-xs">
            Failed to load git status.
          </div>
        )}
        {diffError && (
          <div className="border-latte-red/40 bg-latte-red/10 text-latte-red rounded-2xl border px-4 py-2 text-xs">
            {diffError}
          </div>
        )}
        <div className={`relative ${diffLoading ? "min-h-[120px]" : ""}`}>
          {diffLoading && (
            <div className="bg-latte-base/70 pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="border-latte-lavender/20 h-10 w-10 rounded-full border-2" />
                  <div className="border-latte-lavender absolute inset-0 h-10 w-10 animate-spin rounded-full border-2 border-t-transparent" />
                </div>
                <span className="text-latte-subtext0 text-xs font-medium">Loading changes...</span>
              </div>
            </div>
          )}
          {diffSummary && diffSummary.files.length === 0 && !diffSummary.reason && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="bg-latte-green/10 flex h-12 w-12 items-center justify-center rounded-full">
                <FileCheck className="text-latte-green h-6 w-6" />
              </div>
              <p className="text-latte-subtext0 text-sm">Working directory is clean</p>
            </div>
          )}
          <div className="flex flex-col gap-2">
            {diffSummary?.files.map((file) => {
              const isOpen = Boolean(diffOpen[file.path]);
              const loadingFile = Boolean(diffLoadingFiles[file.path]);
              const fileData = diffFiles[file.path];
              const renderedPatch = renderedPatches[file.path];
              const statusLabel = file.status === "?" ? "U" : file.status;
              const additionsLabel =
                file.additions === null || typeof file.additions === "undefined"
                  ? "—"
                  : String(file.additions);
              const deletionsLabel =
                file.deletions === null || typeof file.deletions === "undefined"
                  ? "—"
                  : String(file.deletions);
              return (
                <div
                  key={`${file.path}-${file.status}`}
                  className="border-latte-surface2/70 bg-latte-base/70 rounded-2xl border"
                >
                  <button
                    type="button"
                    onClick={() => onToggle(file.path)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`${diffStatusClass(
                          statusLabel,
                        )} text-[10px] font-semibold uppercase tracking-[0.25em]`}
                      >
                        {statusLabel}
                      </span>
                      <span className="text-latte-text truncate text-sm">{file.path}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-latte-green">+{additionsLabel}</span>
                      <span className="text-latte-red">-{deletionsLabel}</span>
                      {isOpen ? (
                        <ChevronUp className="text-latte-subtext0 h-4 w-4" />
                      ) : (
                        <ChevronDown className="text-latte-subtext0 h-4 w-4" />
                      )}
                      <span className="sr-only">{isOpen ? "Hide" : "Show"}</span>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-latte-surface2/70 border-t px-3 py-2">
                      {loadingFile && <p className="text-latte-subtext0 text-xs">Loading diff…</p>}
                      {!loadingFile && fileData?.binary && (
                        <p className="text-latte-subtext0 text-xs">Binary file (no diff).</p>
                      )}
                      {!loadingFile && !fileData?.binary && fileData?.patch && (
                        <div className="custom-scrollbar max-h-[360px] overflow-auto">
                          <div className="text-latte-text w-max min-w-full whitespace-pre pl-4 font-mono text-xs">
                            {renderedPatch?.nodes}
                          </div>
                          {renderedPatch?.truncated && (
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                              <span className="text-latte-subtext0">
                                Showing first {renderedPatch.previewLines} of{" "}
                                {renderedPatch.totalLines} lines.
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleExpandDiff(file.path)}
                                className="h-7 px-2 text-[11px]"
                              >
                                Render full diff
                              </Button>
                            </div>
                          )}
                          {fileData.truncated && (
                            <p className="text-latte-subtext0 mt-2 text-xs">Diff truncated.</p>
                          )}
                        </div>
                      )}
                      {!loadingFile && !fileData?.binary && !fileData?.patch && (
                        <p className="text-latte-subtext0 text-xs">No diff available.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    );
  },
);

DiffSection.displayName = "DiffSection";
