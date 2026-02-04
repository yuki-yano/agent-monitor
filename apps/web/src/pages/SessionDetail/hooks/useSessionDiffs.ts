import type { DiffFile, DiffSummary } from "@vde-monitor/shared";
import { useCallback, useEffect, useRef, useState } from "react";

import { API_ERROR_MESSAGES } from "@/lib/api-messages";

import { AUTO_REFRESH_INTERVAL_MS, buildDiffSummarySignature } from "../sessionDetailUtils";

type UseSessionDiffsParams = {
  paneId: string;
  connected: boolean;
  requestDiffSummary: (paneId: string, options?: { force?: boolean }) => Promise<DiffSummary>;
  requestDiffFile: (
    paneId: string,
    path: string,
    rev?: string | null,
    options?: { force?: boolean },
  ) => Promise<DiffFile>;
};

export const useSessionDiffs = ({
  paneId,
  connected,
  requestDiffSummary,
  requestDiffFile,
}: UseSessionDiffsParams) => {
  const [diffSummary, setDiffSummary] = useState<DiffSummary | null>(null);
  const [diffError, setDiffError] = useState<string | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffFiles, setDiffFiles] = useState<Record<string, DiffFile>>({});
  const [diffOpen, setDiffOpen] = useState<Record<string, boolean>>({});
  const [diffLoadingFiles, setDiffLoadingFiles] = useState<Record<string, boolean>>({});

  const diffOpenRef = useRef<Record<string, boolean>>({});
  const diffSignatureRef = useRef<string | null>(null);

  const applyDiffSummary = useCallback(
    async (summary: DiffSummary, refreshOpenFiles: boolean) => {
      setDiffSummary(summary);
      setDiffFiles({});
      const fileSet = new Set(summary.files.map((file) => file.path));
      setDiffOpen((prev) => {
        if (!summary.files.length) {
          return {};
        }
        const next: Record<string, boolean> = {};
        Object.entries(prev).forEach(([key, value]) => {
          if (fileSet.has(key)) {
            next[key] = value;
          }
        });
        return next;
      });
      const openTargets = Object.entries(diffOpenRef.current).filter(
        ([path, value]) => value && fileSet.has(path),
      );
      if (openTargets.length > 0 && refreshOpenFiles) {
        await Promise.all(
          openTargets.map(async ([path]) => {
            try {
              const file = await requestDiffFile(paneId, path, summary.rev, { force: true });
              setDiffFiles((prev) => ({ ...prev, [path]: file }));
            } catch (err) {
              setDiffError(err instanceof Error ? err.message : API_ERROR_MESSAGES.diffFile);
            }
          }),
        );
      }
    },
    [paneId, requestDiffFile],
  );

  const loadDiffSummary = useCallback(async () => {
    if (!paneId) return;
    setDiffLoading(true);
    setDiffError(null);
    try {
      const summary = await requestDiffSummary(paneId, { force: true });
      await applyDiffSummary(summary, true);
    } catch (err) {
      setDiffError(err instanceof Error ? err.message : API_ERROR_MESSAGES.diffSummary);
    } finally {
      setDiffLoading(false);
    }
  }, [applyDiffSummary, paneId, requestDiffSummary]);

  const pollDiffSummary = useCallback(async () => {
    if (!paneId) return;
    try {
      const summary = await requestDiffSummary(paneId, { force: true });
      const signature = buildDiffSummarySignature(summary);
      if (signature === diffSignatureRef.current) {
        return;
      }
      setDiffError(null);
      await applyDiffSummary(summary, true);
    } catch {
      return;
    }
  }, [applyDiffSummary, paneId, requestDiffSummary]);

  const loadDiffFile = useCallback(
    async (path: string) => {
      if (!paneId || !diffSummary?.rev) return;
      if (diffLoadingFiles[path]) return;
      setDiffLoadingFiles((prev) => ({ ...prev, [path]: true }));
      try {
        const file = await requestDiffFile(paneId, path, diffSummary.rev, { force: true });
        setDiffFiles((prev) => ({ ...prev, [path]: file }));
      } catch (err) {
        setDiffError(err instanceof Error ? err.message : API_ERROR_MESSAGES.diffFile);
      } finally {
        setDiffLoadingFiles((prev) => ({ ...prev, [path]: false }));
      }
    },
    [diffLoadingFiles, diffSummary?.rev, paneId, requestDiffFile],
  );

  const toggleDiff = useCallback(
    (path: string) => {
      setDiffOpen((prev) => {
        const nextOpen = !prev[path];
        if (nextOpen) {
          void loadDiffFile(path);
        }
        return { ...prev, [path]: nextOpen };
      });
    },
    [loadDiffFile],
  );

  useEffect(() => {
    loadDiffSummary();
  }, [loadDiffSummary]);

  useEffect(() => {
    if (!paneId || !connected) {
      return;
    }
    const intervalId = window.setInterval(() => {
      if (document.hidden) return;
      void pollDiffSummary();
    }, AUTO_REFRESH_INTERVAL_MS);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [connected, paneId, pollDiffSummary]);

  useEffect(() => {
    setDiffSummary(null);
    setDiffFiles({});
    setDiffOpen({});
    setDiffError(null);
    diffSignatureRef.current = null;
  }, [paneId]);

  useEffect(() => {
    diffOpenRef.current = diffOpen;
  }, [diffOpen]);

  useEffect(() => {
    diffSignatureRef.current = diffSummary ? buildDiffSummarySignature(diffSummary) : null;
  }, [diffSummary]);

  return {
    diffSummary,
    diffError,
    diffLoading,
    diffFiles,
    diffOpen,
    diffLoadingFiles,
    refreshDiff: loadDiffSummary,
    toggleDiff,
  };
};
