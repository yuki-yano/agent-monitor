import { defaultDangerKeys } from "@tmux-agent-monitor/shared";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Card } from "@/components/ui/card";
import { buildSessionGroups } from "@/lib/session-group";
import { useSessions } from "@/state/session-context";
import { useTheme } from "@/state/theme-context";

import { CommitSection } from "./components/CommitSection";
import { ControlsPanel } from "./components/ControlsPanel";
import { DiffSection } from "./components/DiffSection";
import { LogModal } from "./components/LogModal";
import { QuickPanel } from "./components/QuickPanel";
import { ScreenPanel } from "./components/ScreenPanel";
import { SessionHeader } from "./components/SessionHeader";
import { useSessionCommits } from "./hooks/useSessionCommits";
import { useSessionDiffs } from "./hooks/useSessionDiffs";
import { useSessionLogs } from "./hooks/useSessionLogs";
import { useSessionScreen } from "./hooks/useSessionScreen";
import { useSessionTitleEditor } from "./hooks/useSessionTitleEditor";
import { backLinkClass, isDangerousText } from "./sessionDetailUtils";

export const SessionDetailPage = () => {
  const { paneId: paneIdEncoded } = useParams();
  const paneId = paneIdEncoded ?? "";
  const {
    sessions,
    connected,
    connectionIssue,
    getSessionDetail,
    reconnect,
    requestCommitDetail,
    requestCommitFile,
    requestCommitLog,
    requestDiffFile,
    requestDiffSummary,
    requestScreen,
    sendText,
    sendKeys,
    updateSessionTitle,
    readOnly,
  } = useSessions();
  const { resolvedTheme } = useTheme();
  const session = getSessionDetail(paneId);
  const navigate = useNavigate();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const textInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [autoEnter, setAutoEnter] = useState(true);
  const [shiftHeld, setShiftHeld] = useState(false);
  const [ctrlHeld, setCtrlHeld] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);

  const {
    mode,
    screenLines,
    imageBase64,
    fallbackReason,
    error,
    setScreenError,
    isScreenLoading,
    isAtBottom,
    setIsAtBottom,
    refreshScreen,
    scrollToBottom,
    handleModeChange,
    virtuosoRef,
  } = useSessionScreen({
    paneId,
    connected,
    connectionIssue,
    requestScreen,
    resolvedTheme,
    agent: session?.agent,
  });

  const {
    diffSummary,
    diffError,
    diffLoading,
    diffFiles,
    diffOpen,
    diffLoadingFiles,
    refreshDiff,
    toggleDiff,
  } = useSessionDiffs({
    paneId,
    connected,
    requestDiffSummary,
    requestDiffFile,
  });

  const {
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
    refreshCommitLog,
    loadMoreCommits,
    toggleCommit,
    toggleCommitFile,
    copyHash,
  } = useSessionCommits({
    paneId,
    connected,
    requestCommitLog,
    requestCommitDetail,
    requestCommitFile,
  });

  const {
    quickPanelOpen,
    logModalOpen,
    selectedPaneId,
    selectedSession,
    selectedLogLines,
    selectedLogLoading,
    selectedLogError,
    openLogModal,
    closeLogModal,
    toggleQuickPanel,
    closeQuickPanel,
  } = useSessionLogs({
    connected,
    connectionIssue,
    sessions,
    requestScreen,
    resolvedTheme,
  });

  const {
    titleDraft,
    titleEditing,
    titleSaving,
    titleError,
    openTitleEditor,
    closeTitleEditor,
    updateTitleDraft,
    saveTitle,
    clearTitle,
  } = useSessionTitleEditor({
    session,
    paneId,
    readOnly,
    updateSessionTitle,
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const sessionGroups = useMemo(() => buildSessionGroups(sessions), [sessions]);

  const mapKeyWithModifiers = useCallback(
    (key: string) => {
      if (shiftHeld && key === "Tab") {
        return "BTab";
      }
      if (ctrlHeld) {
        const ctrlMap: Record<string, string> = {
          Left: "C-Left",
          Right: "C-Right",
          Up: "C-Up",
          Down: "C-Down",
          Tab: "C-Tab",
          Enter: "C-Enter",
          Escape: "C-Escape",
          BTab: "C-BTab",
        };
        if (ctrlMap[key]) {
          return ctrlMap[key];
        }
      }
      return key;
    },
    [ctrlHeld, shiftHeld],
  );

  const handleSendKey = async (key: string) => {
    if (readOnly) return;
    const mapped = mapKeyWithModifiers(key);
    const hasDanger = defaultDangerKeys.includes(mapped);
    if (hasDanger) {
      const confirmed = window.confirm("Dangerous key detected. Send anyway?");
      if (!confirmed) return;
    }
    const result = await sendKeys(paneId, [mapped]);
    if (!result.ok) {
      setScreenError(result.error?.message ?? "Failed to send keys");
    }
  };

  const handleSendText = async () => {
    if (readOnly) return;
    const currentValue = textInputRef.current?.value ?? "";
    if (!currentValue.trim()) return;
    if (isDangerousText(currentValue)) {
      const confirmed = window.confirm("Dangerous command detected. Send anyway?");
      if (!confirmed) return;
    }
    const result = await sendText(paneId, currentValue, autoEnter);
    if (!result.ok) {
      setScreenError(result.error?.message ?? "Failed to send text");
      return;
    }
    if (textInputRef.current) {
      textInputRef.current.value = "";
    }
    if (mode === "text") {
      scrollToBottom("auto");
    }
  };

  const handleRefreshScreen = useCallback(() => {
    if (connected) {
      void refreshScreen();
    } else {
      reconnect();
    }
  }, [connected, reconnect, refreshScreen]);

  const handleOpenInNewTab = useCallback(() => {
    if (!selectedPaneId) return;
    const encoded = encodeURIComponent(selectedPaneId);
    window.open(`/sessions/${encoded}`, "_blank", "noopener,noreferrer");
  }, [selectedPaneId]);

  const handleOpenHere = useCallback(() => {
    if (!selectedPaneId) return;
    const encoded = encodeURIComponent(selectedPaneId);
    closeQuickPanel();
    navigate(`/sessions/${encoded}`);
    closeLogModal();
  }, [closeLogModal, closeQuickPanel, navigate, selectedPaneId]);

  if (!session) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6">
        <Card>
          <p className="text-latte-subtext0 text-sm">Session not found.</p>
          <Link to="/" className={`${backLinkClass} mt-4`}>
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="animate-fade-in-up mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
        <SessionHeader
          session={session}
          readOnly={readOnly}
          connectionIssue={connectionIssue}
          nowMs={nowMs}
          titleDraft={titleDraft}
          titleEditing={titleEditing}
          titleSaving={titleSaving}
          titleError={titleError}
          onTitleDraftChange={updateTitleDraft}
          onTitleSave={saveTitle}
          onTitleClear={clearTitle}
          onOpenTitleEditor={openTitleEditor}
          onCloseTitleEditor={closeTitleEditor}
        />

        <div className="flex min-w-0 flex-col gap-4">
          <ScreenPanel
            mode={mode}
            onModeChange={handleModeChange}
            connected={connected}
            onRefresh={handleRefreshScreen}
            fallbackReason={fallbackReason}
            error={error}
            isScreenLoading={isScreenLoading}
            imageBase64={imageBase64}
            screenLines={screenLines}
            virtuosoRef={virtuosoRef}
            isAtBottom={isAtBottom}
            onAtBottomChange={setIsAtBottom}
            onScrollToBottom={scrollToBottom}
            controls={
              <ControlsPanel
                readOnly={readOnly}
                connected={connected}
                textInputRef={textInputRef}
                onSendText={handleSendText}
                autoEnter={autoEnter}
                onToggleAutoEnter={() => setAutoEnter((prev) => !prev)}
                controlsOpen={controlsOpen}
                onToggleControls={() => setControlsOpen((prev) => !prev)}
                shiftHeld={shiftHeld}
                onToggleShift={() => setShiftHeld((prev) => !prev)}
                ctrlHeld={ctrlHeld}
                onToggleCtrl={() => setCtrlHeld((prev) => !prev)}
                onSendKey={handleSendKey}
              />
            }
          />
        </div>

        <DiffSection
          diffSummary={diffSummary}
          diffError={diffError}
          diffLoading={diffLoading}
          diffFiles={diffFiles}
          diffOpen={diffOpen}
          diffLoadingFiles={diffLoadingFiles}
          onRefresh={refreshDiff}
          onToggle={toggleDiff}
        />

        <CommitSection
          commitLog={commitLog}
          commitError={commitError}
          commitLoading={commitLoading}
          commitLoadingMore={commitLoadingMore}
          commitHasMore={commitHasMore}
          commitDetails={commitDetails}
          commitFileDetails={commitFileDetails}
          commitFileOpen={commitFileOpen}
          commitFileLoading={commitFileLoading}
          commitOpen={commitOpen}
          commitLoadingDetails={commitLoadingDetails}
          copiedHash={copiedHash}
          onRefresh={refreshCommitLog}
          onLoadMore={loadMoreCommits}
          onToggleCommit={toggleCommit}
          onToggleCommitFile={toggleCommitFile}
          onCopyHash={copyHash}
        />
      </div>

      <QuickPanel
        open={quickPanelOpen}
        sessionGroups={sessionGroups}
        nowMs={nowMs}
        onOpenLogModal={openLogModal}
        onClose={closeQuickPanel}
        onToggle={toggleQuickPanel}
      />

      <LogModal
        open={logModalOpen}
        session={selectedSession}
        logLines={selectedLogLines}
        loading={selectedLogLoading}
        error={selectedLogError}
        onClose={closeLogModal}
        onOpenHere={handleOpenHere}
        onOpenNewTab={handleOpenInNewTab}
      />
    </>
  );
};
