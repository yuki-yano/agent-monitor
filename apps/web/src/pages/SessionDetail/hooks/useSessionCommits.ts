import type { CommitDetail, CommitFileDiff, CommitLog } from "@vde-monitor/shared";
import { useCallback, useEffect, useRef, useState } from "react";

import { API_ERROR_MESSAGES } from "@/lib/api-messages";

import { AUTO_REFRESH_INTERVAL_MS, buildCommitLogSignature } from "../sessionDetailUtils";

type UseSessionCommitsParams = {
  paneId: string;
  connected: boolean;
  requestCommitLog: (
    paneId: string,
    options?: { limit?: number; skip?: number; force?: boolean },
  ) => Promise<CommitLog>;
  requestCommitDetail: (
    paneId: string,
    hash: string,
    options?: { force?: boolean },
  ) => Promise<CommitDetail>;
  requestCommitFile: (
    paneId: string,
    hash: string,
    path: string,
    options?: { force?: boolean },
  ) => Promise<CommitFileDiff>;
};

export const useSessionCommits = ({
  paneId,
  connected,
  requestCommitLog,
  requestCommitDetail,
  requestCommitFile,
}: UseSessionCommitsParams) => {
  const commitPageSize = 10;
  const [commitLog, setCommitLog] = useState<CommitLog | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [commitLoading, setCommitLoading] = useState(false);
  const [commitLoadingMore, setCommitLoadingMore] = useState(false);
  const [commitHasMore, setCommitHasMore] = useState(true);
  const [commitDetails, setCommitDetails] = useState<Record<string, CommitDetail>>({});
  const [commitFileDetails, setCommitFileDetails] = useState<Record<string, CommitFileDiff>>({});
  const [commitFileOpen, setCommitFileOpen] = useState<Record<string, boolean>>({});
  const [commitFileLoading, setCommitFileLoading] = useState<Record<string, boolean>>({});
  const [commitOpen, setCommitOpen] = useState<Record<string, boolean>>({});
  const [commitLoadingDetails, setCommitLoadingDetails] = useState<Record<string, boolean>>({});
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const commitLogRef = useRef<CommitLog | null>(null);
  const commitSignatureRef = useRef<string | null>(null);
  const commitCopyTimeoutRef = useRef<number | null>(null);

  const applyCommitLog = useCallback(
    (log: CommitLog, options: { append: boolean; updateSignature: boolean }) => {
      setCommitLog((prev) => {
        const prevCommits = options.append && prev ? prev.commits : [];
        const merged = options.append ? [...prevCommits, ...log.commits] : log.commits;
        const unique = new Map<string, (typeof merged)[number]>();
        merged.forEach((commit) => {
          if (!unique.has(commit.hash)) {
            unique.set(commit.hash, commit);
          }
        });
        return {
          ...log,
          commits: Array.from(unique.values()),
        };
      });
      if (!options.append) {
        const commitSet = new Set(log.commits.map((commit) => commit.hash));
        setCommitDetails((prev) => {
          const next: Record<string, CommitDetail> = {};
          Object.entries(prev).forEach(([hash, detail]) => {
            if (commitSet.has(hash)) {
              next[hash] = detail;
            }
          });
          return next;
        });
        setCommitFileDetails((prev) => {
          const next: Record<string, CommitFileDiff> = {};
          Object.entries(prev).forEach(([key, detail]) => {
            const [hash] = key.split(":");
            if (hash && commitSet.has(hash)) {
              next[key] = detail;
            }
          });
          return next;
        });
        setCommitFileOpen((prev) => {
          const next: Record<string, boolean> = {};
          Object.entries(prev).forEach(([key, value]) => {
            const [hash] = key.split(":");
            if (hash && commitSet.has(hash)) {
              next[key] = value;
            }
          });
          return next;
        });
        setCommitFileLoading((prev) => {
          const next: Record<string, boolean> = {};
          Object.entries(prev).forEach(([key, value]) => {
            const [hash] = key.split(":");
            if (hash && commitSet.has(hash)) {
              next[key] = value;
            }
          });
          return next;
        });
        setCommitOpen((prev) => {
          if (!log.commits.length) {
            return {};
          }
          const next: Record<string, boolean> = {};
          Object.entries(prev).forEach(([hash, value]) => {
            if (commitSet.has(hash)) {
              next[hash] = value;
            }
          });
          return next;
        });
      }
      setCommitHasMore(log.commits.length === commitPageSize);
      if (options.updateSignature) {
        commitSignatureRef.current = buildCommitLogSignature(log);
      }
    },
    [commitPageSize],
  );

  const loadCommitLog = useCallback(
    async (options?: { append?: boolean; force?: boolean }) => {
      if (!paneId) return;
      const append = options?.append ?? false;
      if (append) {
        setCommitLoadingMore(true);
      } else {
        setCommitLoading(true);
      }
      setCommitError(null);
      try {
        const skip = append ? (commitLogRef.current?.commits.length ?? 0) : 0;
        const log = await requestCommitLog(paneId, {
          limit: commitPageSize,
          skip,
          force: options?.force,
        });
        applyCommitLog(log, { append, updateSignature: !append });
      } catch (err) {
        if (!append) {
          setCommitError(err instanceof Error ? err.message : API_ERROR_MESSAGES.commitLog);
        }
      } finally {
        if (append) {
          setCommitLoadingMore(false);
        } else {
          setCommitLoading(false);
        }
      }
    },
    [applyCommitLog, commitPageSize, paneId, requestCommitLog],
  );

  const loadCommitDetail = useCallback(
    async (hash: string) => {
      if (!paneId || commitLoadingDetails[hash]) return;
      setCommitLoadingDetails((prev) => ({ ...prev, [hash]: true }));
      try {
        const detail = await requestCommitDetail(paneId, hash, { force: true });
        setCommitDetails((prev) => ({ ...prev, [hash]: detail }));
      } catch (err) {
        setCommitError(err instanceof Error ? err.message : API_ERROR_MESSAGES.commitDetail);
      } finally {
        setCommitLoadingDetails((prev) => ({ ...prev, [hash]: false }));
      }
    },
    [commitLoadingDetails, paneId, requestCommitDetail],
  );

  const loadCommitFile = useCallback(
    async (hash: string, path: string) => {
      if (!paneId) return;
      const key = `${hash}:${path}`;
      if (commitFileLoading[key]) return;
      setCommitFileLoading((prev) => ({ ...prev, [key]: true }));
      try {
        const file = await requestCommitFile(paneId, hash, path, { force: true });
        setCommitFileDetails((prev) => ({ ...prev, [key]: file }));
      } catch (err) {
        setCommitError(err instanceof Error ? err.message : API_ERROR_MESSAGES.commitFile);
      } finally {
        setCommitFileLoading((prev) => ({ ...prev, [key]: false }));
      }
    },
    [commitFileLoading, paneId, requestCommitFile],
  );

  const pollCommitLog = useCallback(async () => {
    if (!paneId) return;
    try {
      const log = await requestCommitLog(paneId, {
        limit: commitPageSize,
        skip: 0,
        force: true,
      });
      const signature = buildCommitLogSignature(log);
      if (signature === commitSignatureRef.current) {
        return;
      }
      setCommitError(null);
      applyCommitLog(log, { append: false, updateSignature: true });
    } catch {
      return;
    }
  }, [applyCommitLog, commitPageSize, paneId, requestCommitLog]);

  const toggleCommit = useCallback(
    (hash: string) => {
      setCommitOpen((prev) => {
        const nextOpen = !prev[hash];
        if (nextOpen && !commitDetails[hash]) {
          void loadCommitDetail(hash);
        }
        return { ...prev, [hash]: nextOpen };
      });
    },
    [commitDetails, loadCommitDetail],
  );

  const toggleCommitFile = useCallback(
    (hash: string, path: string) => {
      const key = `${hash}:${path}`;
      setCommitFileOpen((prev) => {
        const nextOpen = !prev[key];
        if (nextOpen && !commitFileDetails[key]) {
          void loadCommitFile(hash, path);
        }
        return { ...prev, [key]: nextOpen };
      });
    },
    [commitFileDetails, loadCommitFile],
  );

  const copyHash = useCallback(async (hash: string) => {
    let copied = false;
    try {
      await navigator.clipboard.writeText(hash);
      copied = true;
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = hash;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        copied = document.execCommand("copy");
      } catch {
        copied = false;
      } finally {
        document.body.removeChild(textarea);
      }
    }
    if (!copied) return;
    setCopiedHash(hash);
    if (commitCopyTimeoutRef.current) {
      window.clearTimeout(commitCopyTimeoutRef.current);
    }
    commitCopyTimeoutRef.current = window.setTimeout(() => {
      setCopiedHash((prev) => (prev === hash ? null : prev));
    }, 1200);
  }, []);

  useEffect(() => {
    commitLogRef.current = commitLog;
  }, [commitLog]);

  useEffect(() => {
    setCommitLog(null);
    setCommitDetails({});
    setCommitFileDetails({});
    setCommitFileOpen({});
    setCommitFileLoading({});
    setCommitOpen({});
    setCommitError(null);
    setCommitHasMore(true);
    setCommitLoading(false);
    setCommitLoadingMore(false);
    setCommitLoadingDetails({});
    setCopiedHash(null);
    commitSignatureRef.current = null;
    commitLogRef.current = null;
    if (commitCopyTimeoutRef.current) {
      window.clearTimeout(commitCopyTimeoutRef.current);
      commitCopyTimeoutRef.current = null;
    }
  }, [paneId]);

  useEffect(() => {
    loadCommitLog({ force: true });
  }, [loadCommitLog]);

  useEffect(() => {
    if (!paneId || !connected) {
      return;
    }
    const intervalId = window.setInterval(() => {
      if (document.hidden) return;
      void pollCommitLog();
    }, AUTO_REFRESH_INTERVAL_MS);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [connected, paneId, pollCommitLog]);

  useEffect(() => {
    return () => {
      if (commitCopyTimeoutRef.current) {
        window.clearTimeout(commitCopyTimeoutRef.current);
      }
    };
  }, []);

  return {
    commitLog,
    commitError,
    commitLoading,
    commitLoadingMore,
    commitHasMore,
    commitDetails,
    commitFileDetails,
    commitFileOpen,
    commitFileLoading,
    commitOpen,
    commitLoadingDetails,
    copiedHash,
    refreshCommitLog: () => loadCommitLog({ force: true }),
    loadMoreCommits: () => loadCommitLog({ append: true, force: true }),
    toggleCommit,
    toggleCommitFile,
    copyHash,
  };
};
