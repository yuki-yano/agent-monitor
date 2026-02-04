import {
  type ApiEnvelope,
  type CommitDetail,
  type CommitFileDiff,
  type CommitLog,
  type DiffFile,
  type DiffSummary,
  encodePaneId,
  type SessionSummary,
} from "@vde-monitor/shared";
import { hc } from "hono/client";
import { useCallback, useMemo } from "react";

import { API_ERROR_MESSAGES } from "@/lib/api-messages";
import { expectField, extractErrorMessage, requestJson } from "@/lib/api-utils";

import type { ApiAppType } from "../../../server/src/app";

type UseSessionApiParams = {
  token: string | null;
  onSessions: (sessions: SessionSummary[]) => void;
  onConnectionIssue: (message: string | null) => void;
  onReadOnly: () => void;
  onSessionUpdated: (session: SessionSummary) => void;
};

export const useSessionApi = ({
  token,
  onSessions,
  onConnectionIssue,
  onReadOnly,
  onSessionUpdated,
}: UseSessionApiParams) => {
  const ensureToken = useCallback(() => {
    if (!token) {
      throw new Error(API_ERROR_MESSAGES.missingToken);
    }
  }, [token]);

  const notifyReadOnly = useCallback(
    (data: ApiEnvelope<unknown> | null) => {
      if (data?.error?.code === "READ_ONLY") {
        onReadOnly();
      }
    },
    [onReadOnly],
  );

  const authHeaders = useMemo(
    (): Record<string, string> => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token],
  );
  const apiClient = useMemo(
    () =>
      hc<ApiAppType>("/api", {
        headers: authHeaders,
      }),
    [authHeaders],
  );

  const refreshSessions = useCallback(async () => {
    if (!token) return;
    try {
      const { res, data } = await requestJson<ApiEnvelope<{ sessions?: SessionSummary[] }>>(
        apiClient.sessions.$get(),
      );
      if (!res.ok || !data?.sessions) {
        const fallback = res.ok
          ? API_ERROR_MESSAGES.invalidResponse
          : API_ERROR_MESSAGES.requestFailed;
        onConnectionIssue(extractErrorMessage(res, data, fallback, { includeStatus: !res.ok }));
        return;
      }
      onSessions(data.sessions);
      onConnectionIssue(null);
    } catch (err) {
      onConnectionIssue(err instanceof Error ? err.message : "Network error. Reconnecting...");
    }
  }, [apiClient, onConnectionIssue, onSessions, token]);

  const requestDiffSummary = useCallback(
    async (paneId: string, options?: { force?: boolean }) => {
      ensureToken();
      const param = { paneId: encodePaneId(paneId) };
      const query = options?.force ? { force: "1" } : {};
      const { res, data } = await requestJson<ApiEnvelope<{ summary?: DiffSummary }>>(
        apiClient.sessions[":paneId"].diff.$get({ param, query }),
      );
      return expectField(res, data, "summary", API_ERROR_MESSAGES.diffSummary);
    },
    [apiClient, ensureToken],
  );

  const requestDiffFile = useCallback(
    async (
      paneId: string,
      filePath: string,
      rev?: string | null,
      options?: { force?: boolean },
    ) => {
      ensureToken();
      const param = { paneId: encodePaneId(paneId) };
      const query: { path: string; rev?: string; force?: string } = { path: filePath };
      if (rev) {
        query.rev = rev;
      }
      if (options?.force) {
        query.force = "1";
      }
      const { res, data } = await requestJson<ApiEnvelope<{ file?: DiffFile }>>(
        apiClient.sessions[":paneId"].diff.file.$get({ param, query }),
      );
      return expectField(res, data, "file", API_ERROR_MESSAGES.diffFile);
    },
    [apiClient, ensureToken],
  );

  const requestCommitLog = useCallback(
    async (paneId: string, options?: { limit?: number; skip?: number; force?: boolean }) => {
      ensureToken();
      const param = { paneId: encodePaneId(paneId) };
      const query: { limit?: string; skip?: string; force?: string } = {};
      if (options?.limit) {
        query.limit = String(options.limit);
      }
      if (options?.skip) {
        query.skip = String(options.skip);
      }
      if (options?.force) {
        query.force = "1";
      }
      const { res, data } = await requestJson<ApiEnvelope<{ log?: CommitLog }>>(
        apiClient.sessions[":paneId"].commits.$get({ param, query }),
      );
      return expectField(res, data, "log", API_ERROR_MESSAGES.commitLog);
    },
    [apiClient, ensureToken],
  );

  const requestCommitDetail = useCallback(
    async (paneId: string, hash: string, options?: { force?: boolean }) => {
      ensureToken();
      const param = { paneId: encodePaneId(paneId), hash };
      const query = options?.force ? { force: "1" } : {};
      const { res, data } = await requestJson<ApiEnvelope<{ commit?: CommitDetail }>>(
        apiClient.sessions[":paneId"].commits[":hash"].$get({ param, query }),
      );
      return expectField(res, data, "commit", API_ERROR_MESSAGES.commitDetail);
    },
    [apiClient, ensureToken],
  );

  const requestCommitFile = useCallback(
    async (paneId: string, hash: string, path: string, options?: { force?: boolean }) => {
      ensureToken();
      const param = { paneId: encodePaneId(paneId), hash };
      const query: { path: string; force?: string } = { path };
      if (options?.force) {
        query.force = "1";
      }
      const { res, data } = await requestJson<ApiEnvelope<{ file?: CommitFileDiff }>>(
        apiClient.sessions[":paneId"].commits[":hash"].file.$get({
          param,
          query,
        }),
      );
      return expectField(res, data, "file", API_ERROR_MESSAGES.commitFile);
    },
    [apiClient, ensureToken],
  );

  const updateSessionTitle = useCallback(
    async (paneId: string, title: string | null) => {
      ensureToken();
      const { res, data } = await requestJson<ApiEnvelope<{ session?: SessionSummary }>>(
        apiClient.sessions[":paneId"].title.$put({
          param: { paneId: encodePaneId(paneId) },
          json: { title },
        }),
      );
      if (!res.ok) {
        notifyReadOnly(data);
        throw new Error(extractErrorMessage(res, data, API_ERROR_MESSAGES.updateTitle));
      }
      if (!data) {
        throw new Error(API_ERROR_MESSAGES.updateTitle);
      }
      if (data.session) {
        onSessionUpdated(data.session);
        return;
      }
      await refreshSessions();
    },
    [apiClient, ensureToken, notifyReadOnly, onSessionUpdated, refreshSessions],
  );

  const touchSession = useCallback(
    async (paneId: string) => {
      ensureToken();
      const { res, data } = await requestJson<ApiEnvelope<{ session?: SessionSummary }>>(
        apiClient.sessions[":paneId"].touch.$post({
          param: { paneId: encodePaneId(paneId) },
        }),
      );
      if (!res.ok) {
        notifyReadOnly(data);
        throw new Error(extractErrorMessage(res, data, API_ERROR_MESSAGES.updateActivity));
      }
      if (!data) {
        throw new Error(API_ERROR_MESSAGES.updateActivity);
      }
      if (data.session) {
        onSessionUpdated(data.session);
        return;
      }
      await refreshSessions();
    },
    [apiClient, ensureToken, notifyReadOnly, onSessionUpdated, refreshSessions],
  );

  return {
    refreshSessions,
    requestDiffSummary,
    requestDiffFile,
    requestCommitLog,
    requestCommitDetail,
    requestCommitFile,
    updateSessionTitle,
    touchSession,
  };
};
