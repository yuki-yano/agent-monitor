import { useSetAtom } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef } from "react";

import { useSessions } from "@/state/session-context";
import { useTheme } from "@/state/theme-context";

import {
  connectedAtom,
  connectionIssueAtom,
  connectionStatusAtom,
  fileNavigatorConfigAtom,
  highlightCorrectionsAtom,
  paneIdAtom,
  resolvedThemeAtom,
  type SessionApi,
  sessionApiAtom,
  sessionsAtom,
} from "./atoms/sessionDetailAtoms";

type SessionDetailProviderProps = {
  paneId: string;
  children: ReactNode;
};

type SessionDetailAtomSnapshot = {
  paneId: string;
  sessions: ReturnType<typeof useSessions>["sessions"];
  connected: boolean;
  connectionStatus: ReturnType<typeof useSessions>["connectionStatus"];
  connectionIssue: string | null;
  highlightCorrections: ReturnType<typeof useSessions>["highlightCorrections"];
  fileNavigatorConfig: ReturnType<typeof useSessions>["fileNavigatorConfig"];
  resolvedTheme: ReturnType<typeof useTheme>["resolvedTheme"];
  sessionApi: SessionApi;
};

const useSyncAtomValue = <T,>(value: T, setValue: (nextValue: T) => void) => {
  useEffect(() => {
    setValue(value);
  }, [setValue, value]);
};

const SessionDetailInitialHydrator = ({ snapshot }: { snapshot: SessionDetailAtomSnapshot }) => {
  useHydrateAtoms([
    [paneIdAtom, snapshot.paneId],
    [sessionsAtom, snapshot.sessions],
    [connectedAtom, snapshot.connected],
    [connectionStatusAtom, snapshot.connectionStatus],
    [connectionIssueAtom, snapshot.connectionIssue],
    [highlightCorrectionsAtom, snapshot.highlightCorrections],
    [fileNavigatorConfigAtom, snapshot.fileNavigatorConfig],
    [resolvedThemeAtom, snapshot.resolvedTheme],
    [sessionApiAtom, snapshot.sessionApi],
  ]);

  return null;
};

const SessionDetailAtomSynchronizer = ({ snapshot }: { snapshot: SessionDetailAtomSnapshot }) => {
  const setPaneId = useSetAtom(paneIdAtom);
  const setSessions = useSetAtom(sessionsAtom);
  const setConnected = useSetAtom(connectedAtom);
  const setConnectionStatus = useSetAtom(connectionStatusAtom);
  const setConnectionIssue = useSetAtom(connectionIssueAtom);
  const setHighlightCorrections = useSetAtom(highlightCorrectionsAtom);
  const setFileNavigatorConfig = useSetAtom(fileNavigatorConfigAtom);
  const setResolvedTheme = useSetAtom(resolvedThemeAtom);
  const setSessionApi = useSetAtom(sessionApiAtom);

  useSyncAtomValue(snapshot.paneId, setPaneId);
  useSyncAtomValue(snapshot.sessions, setSessions);
  useSyncAtomValue(snapshot.connected, setConnected);
  useSyncAtomValue(snapshot.connectionStatus, setConnectionStatus);
  useSyncAtomValue(snapshot.connectionIssue, setConnectionIssue);
  useSyncAtomValue(snapshot.highlightCorrections, setHighlightCorrections);
  useSyncAtomValue(snapshot.fileNavigatorConfig, setFileNavigatorConfig);
  useSyncAtomValue(snapshot.resolvedTheme, setResolvedTheme);
  useSyncAtomValue(snapshot.sessionApi, setSessionApi);

  return null;
};

const SessionDetailHydrator = ({ paneId }: { paneId: string }) => {
  const {
    sessions,
    connected,
    connectionStatus,
    connectionIssue,
    highlightCorrections,
    fileNavigatorConfig,
    reconnect,
    requestDiffSummary,
    requestDiffFile,
    requestCommitLog,
    requestCommitDetail,
    requestCommitFile,
    requestStateTimeline,
    requestRepoFileTree,
    requestRepoFileSearch,
    requestRepoFileContent,
    requestScreen,
    focusPane,
    uploadImageAttachment,
    sendText,
    sendKeys,
    sendRaw,
    touchSession,
    updateSessionTitle,
  } = useSessions();
  const { resolvedTheme } = useTheme();
  const sessionApi = useMemo<SessionApi>(
    () => ({
      reconnect,
      requestDiffSummary,
      requestDiffFile,
      requestCommitLog,
      requestCommitDetail,
      requestCommitFile,
      requestStateTimeline,
      requestRepoFileTree,
      requestRepoFileSearch,
      requestRepoFileContent,
      requestScreen,
      focusPane,
      uploadImageAttachment,
      sendText,
      sendKeys,
      sendRaw,
      touchSession,
      updateSessionTitle,
    }),
    [
      reconnect,
      requestDiffSummary,
      requestDiffFile,
      requestCommitLog,
      requestCommitDetail,
      requestCommitFile,
      requestStateTimeline,
      requestRepoFileTree,
      requestRepoFileSearch,
      requestRepoFileContent,
      requestScreen,
      focusPane,
      uploadImageAttachment,
      sendText,
      sendKeys,
      sendRaw,
      touchSession,
      updateSessionTitle,
    ],
  );

  const snapshot = useMemo<SessionDetailAtomSnapshot>(
    () => ({
      paneId,
      sessions,
      connected,
      connectionStatus,
      connectionIssue,
      highlightCorrections,
      fileNavigatorConfig,
      resolvedTheme,
      sessionApi,
    }),
    [
      paneId,
      sessions,
      connected,
      connectionStatus,
      connectionIssue,
      highlightCorrections,
      fileNavigatorConfig,
      resolvedTheme,
      sessionApi,
    ],
  );
  const initialSnapshotRef = useRef<null | SessionDetailAtomSnapshot>(null);
  if (initialSnapshotRef.current == null) {
    initialSnapshotRef.current = snapshot;
  }

  return (
    <>
      <SessionDetailInitialHydrator snapshot={initialSnapshotRef.current} />
      <SessionDetailAtomSynchronizer snapshot={snapshot} />
    </>
  );
};

export const SessionDetailProvider = ({ paneId, children }: SessionDetailProviderProps) => {
  return (
    <>
      <SessionDetailHydrator paneId={paneId} />
      {children}
    </>
  );
};
