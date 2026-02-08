import {
  type ApiEnvelope,
  type ApiError,
  type CommandResponse,
  type HighlightCorrectionConfig,
  type ScreenResponse,
  type SessionSummary,
} from "@vde-monitor/shared";
import { useCallback, useMemo, useRef } from "react";

import { API_ERROR_MESSAGES } from "@/lib/api-messages";

import { createSessionActionRequests } from "./session-api-action-requests";
import { createApiClient } from "./session-api-contract";
import { createSessionQueryRequests } from "./session-api-query-requests";
import {
  mutateSession as executeMutateSession,
  refreshSessions as executeRefreshSessions,
  requestCommand as executeRequestCommand,
  requestScreenResponse as executeRequestScreenResponse,
  requestSessionField as executeRequestSessionField,
} from "./session-api-request-executors";
import {
  buildPaneHashParam,
  buildPaneParam,
  buildScreenRequestJson,
  buildScreenRequestKeys,
  executeInflightRequest,
  type RefreshSessionsResult,
  resolveScreenMode,
} from "./session-api-utils";

type UseSessionApiParams = {
  token: string | null;
  apiBaseUrl?: string | null;
  onSessions: (sessions: SessionSummary[]) => void;
  onConnectionIssue: (message: string | null) => void;
  onSessionUpdated: (session: SessionSummary) => void;
  onSessionRemoved: (paneId: string) => void;
  onHighlightCorrections: (config: HighlightCorrectionConfig) => void;
};

type PaneParam = ReturnType<typeof buildPaneParam>;
type PaneHashParam = ReturnType<typeof buildPaneHashParam>;

export type { RefreshSessionsResult } from "./session-api-utils";

export const useSessionApi = ({
  token,
  apiBaseUrl,
  onSessions,
  onConnectionIssue,
  onSessionUpdated,
  onSessionRemoved,
  onHighlightCorrections,
}: UseSessionApiParams) => {
  const ensureToken = useCallback(() => {
    if (!token) {
      throw new Error(API_ERROR_MESSAGES.missingToken);
    }
  }, [token]);

  const buildApiError = useCallback(
    (code: ApiError["code"], message: string): ApiError => ({ code, message }),
    [],
  );

  const isPaneMissingError = useCallback((error?: ApiError | null) => {
    if (!error) return false;
    if (error.code === "INVALID_PANE") return true;
    return error.code === "NOT_FOUND" && error.message === "pane not found";
  }, []);

  const handleSessionMissing = useCallback(
    (paneId: string, res: Response, data: ApiEnvelope<unknown> | null) => {
      if (isPaneMissingError(data?.error) || res.status === 410) {
        onSessionRemoved(paneId);
      }
    },
    [isPaneMissingError, onSessionRemoved],
  );

  const authHeaders = useMemo(
    (): Record<string, string> => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token],
  );
  const apiBasePath = useMemo(() => {
    const normalized = apiBaseUrl?.trim();
    return normalized && normalized.length > 0 ? normalized : "/api";
  }, [apiBaseUrl]);
  const apiClient = useMemo(
    () => createApiClient(apiBasePath, authHeaders),
    [apiBasePath, authHeaders],
  );
  const screenInFlightRef = useRef(new Map<string, Promise<ScreenResponse>>());

  const refreshSessions = useCallback(async (): Promise<RefreshSessionsResult> => {
    return executeRefreshSessions({
      token,
      request: apiClient.sessions.$get(),
      onSessions,
      onConnectionIssue,
      onHighlightCorrections,
    });
  }, [apiClient, onConnectionIssue, onHighlightCorrections, onSessions, token]);

  const requestSessionField = useCallback(
    async <T, K extends keyof T>({
      paneId,
      request,
      field,
      fallbackMessage,
      includeStatus,
    }: {
      paneId: string;
      request: Promise<Response>;
      field: K;
      fallbackMessage: string;
      includeStatus?: boolean;
    }): Promise<NonNullable<T[K]>> =>
      executeRequestSessionField({
        paneId,
        request,
        field,
        fallbackMessage,
        includeStatus,
        ensureToken,
        onConnectionIssue,
        handleSessionMissing,
      }),
    [ensureToken, handleSessionMissing, onConnectionIssue],
  );

  const mutateSession = useCallback(
    async (paneId: string, request: Promise<Response>, fallbackMessage: string) =>
      executeMutateSession({
        paneId,
        request,
        fallbackMessage,
        ensureToken,
        onConnectionIssue,
        handleSessionMissing,
        onSessionUpdated,
        refreshSessions,
      }),
    [ensureToken, handleSessionMissing, onConnectionIssue, onSessionUpdated, refreshSessions],
  );

  const requestPaneField = useCallback(
    async <T, K extends keyof T>({
      paneId,
      request,
      field,
      fallbackMessage,
    }: {
      paneId: string;
      request: Promise<Response>;
      field: K;
      fallbackMessage: string;
    }) =>
      requestSessionField<T, K>({
        paneId,
        request,
        field,
        fallbackMessage,
        includeStatus: true,
      }),
    [requestSessionField],
  );

  const requestPaneQueryField = useCallback(
    async <T, K extends keyof T>({
      paneId,
      request,
      field,
      fallbackMessage,
    }: {
      paneId: string;
      request: (param: PaneParam) => Promise<Response>;
      field: K;
      fallbackMessage: string;
    }) =>
      requestPaneField<T, K>({
        paneId,
        request: request(buildPaneParam(paneId)),
        field,
        fallbackMessage,
      }),
    [requestPaneField],
  );

  const requestPaneHashField = useCallback(
    async <T, K extends keyof T>({
      paneId,
      hash,
      request,
      field,
      fallbackMessage,
    }: {
      paneId: string;
      hash: string;
      request: (param: PaneHashParam) => Promise<Response>;
      field: K;
      fallbackMessage: string;
    }) =>
      requestPaneField<T, K>({
        paneId,
        request: request(buildPaneHashParam(paneId, hash)),
        field,
        fallbackMessage,
      }),
    [requestPaneField],
  );

  const {
    requestDiffSummary,
    requestDiffFile,
    requestCommitLog,
    requestCommitDetail,
    requestCommitFile,
    requestStateTimeline,
  } = useMemo(
    () =>
      createSessionQueryRequests({
        apiClient,
        requestPaneQueryField,
        requestPaneHashField,
      }),
    [apiClient, requestPaneHashField, requestPaneQueryField],
  );

  const requestScreen = useCallback(
    async (
      paneId: string,
      options: { lines?: number; mode?: "text" | "image"; cursor?: string },
    ): Promise<ScreenResponse> => {
      ensureToken();
      const normalizedMode = resolveScreenMode(options);
      const { requestKey, fallbackKey } = buildScreenRequestKeys({
        paneId,
        normalizedMode,
        lines: options.lines,
        cursor: options.cursor,
      });
      return executeInflightRequest({
        inFlightMap: screenInFlightRef.current,
        requestKey,
        fallbackKey,
        execute: () => {
          const param = buildPaneParam(paneId);
          const json = buildScreenRequestJson(options, normalizedMode);
          return executeRequestScreenResponse({
            paneId,
            mode: normalizedMode,
            request: apiClient.sessions[":paneId"].screen.$post({ param, json }),
            fallbackMessage: API_ERROR_MESSAGES.screenRequestFailed,
            onConnectionIssue,
            handleSessionMissing,
            isPaneMissingError,
            onSessionRemoved,
            buildApiError,
          });
        },
      });
    },
    [
      apiClient,
      buildApiError,
      ensureToken,
      handleSessionMissing,
      isPaneMissingError,
      onConnectionIssue,
      onSessionRemoved,
      screenInFlightRef,
    ],
  );

  const requestCommand = useCallback(
    async (
      paneId: string,
      request: Promise<Response>,
      fallbackMessage: string,
    ): Promise<CommandResponse> =>
      executeRequestCommand({
        paneId,
        request,
        fallbackMessage,
        ensureToken,
        onConnectionIssue,
        handleSessionMissing,
        buildApiError,
        isPaneMissingError,
        onSessionRemoved,
      }),
    [
      buildApiError,
      ensureToken,
      handleSessionMissing,
      isPaneMissingError,
      onConnectionIssue,
      onSessionRemoved,
    ],
  );

  const runPaneCommand = useCallback(
    (
      paneId: string,
      fallbackMessage: string,
      request: (param: PaneParam) => Promise<Response>,
    ): Promise<CommandResponse> => {
      const param = buildPaneParam(paneId);
      return requestCommand(paneId, request(param), fallbackMessage);
    },
    [requestCommand],
  );

  const runPaneMutation = useCallback(
    (paneId: string, fallbackMessage: string, request: (param: PaneParam) => Promise<Response>) => {
      return mutateSession(paneId, request(buildPaneParam(paneId)), fallbackMessage);
    },
    [mutateSession],
  );

  const {
    sendText,
    focusPane,
    uploadImageAttachment,
    sendKeys,
    sendRaw,
    updateSessionTitle,
    touchSession,
  } = useMemo(
    () =>
      createSessionActionRequests({
        apiClient,
        runPaneCommand,
        runPaneMutation,
        ensureToken,
        onConnectionIssue,
        handleSessionMissing,
      }),
    [
      apiClient,
      ensureToken,
      handleSessionMissing,
      onConnectionIssue,
      runPaneCommand,
      runPaneMutation,
    ],
  );

  return {
    refreshSessions,
    requestDiffSummary,
    requestDiffFile,
    requestCommitLog,
    requestCommitDetail,
    requestCommitFile,
    requestStateTimeline,
    requestScreen,
    sendText,
    focusPane,
    uploadImageAttachment,
    sendKeys,
    sendRaw,
    updateSessionTitle,
    touchSession,
  };
};
