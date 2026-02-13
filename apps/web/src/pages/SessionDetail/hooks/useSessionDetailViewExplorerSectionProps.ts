import { useCallback, useMemo } from "react";

import type { SessionDetailViewProps } from "../SessionDetailView";
import {
  buildFileContentModalProps,
  buildFileNavigatorSectionProps,
  buildLogFileCandidateModalProps,
  buildScreenPanelProps,
} from "./section-props-builders";

export const useSessionDetailViewExplorerSectionProps = ({
  meta,
  sidebar,
  screen,
  controls,
  files,
}: SessionDetailViewProps) => {
  const { paneId, session, connectionIssue } = meta;
  const sourceRepoRoot = session?.repoRoot ?? null;
  const { resolvedTheme } = sidebar;
  const {
    mode,
    screenLines,
    imageBase64,
    fallbackReason,
    error,
    pollingPauseReason,
    contextLeftLabel,
    isScreenLoading,
    isAtBottom,
    handleAtBottomChange,
    handleUserScrollStateChange,
    forceFollow,
    scrollToBottom,
    handleModeChange,
    virtuosoRef,
    scrollerRef,
    handleRefreshScreen,
  } = screen;
  const { rawMode, allowDangerKeys } = controls;
  const {
    unavailable,
    selectedFilePath,
    searchQuery,
    searchActiveIndex,
    searchResult,
    searchLoading,
    searchError,
    searchMode,
    treeLoading,
    treeError,
    treeNodes,
    rootTreeHasMore,
    searchHasMore,
    fileModalOpen,
    fileModalPath,
    fileModalLoading,
    fileModalError,
    fileModalFile,
    fileModalMarkdownViewMode,
    fileModalShowLineNumbers,
    fileModalCopiedPath,
    fileModalCopyError,
    fileModalHighlightLine,
    fileResolveError,
    logFileCandidateModalOpen,
    logFileCandidateReference,
    logFileCandidateItems,
    onSearchQueryChange,
    onSearchMove,
    onSearchConfirm,
    onToggleDirectory,
    onSelectFile,
    onOpenFileModal,
    onCloseFileModal,
    onSetFileModalMarkdownViewMode,
    onToggleFileModalLineNumbers,
    onCopyFileModalPath,
    onResolveLogFileReference,
    onResolveLogFileReferenceCandidates,
    onSelectLogFileCandidate,
    onCloseLogFileCandidateModal,
    onLoadMoreTreeRoot,
    onLoadMoreSearch,
  } = files;

  const fileNavigatorSectionProps = useMemo(
    () =>
      buildFileNavigatorSectionProps({
        unavailable,
        selectedFilePath,
        searchQuery,
        searchActiveIndex,
        searchResult,
        searchLoading,
        searchError,
        searchMode,
        treeLoading,
        treeError,
        treeNodes,
        rootTreeHasMore,
        searchHasMore,
        onSearchQueryChange,
        onSearchMove,
        onSearchConfirm,
        onToggleDirectory,
        onSelectFile,
        onOpenFileModal,
        onLoadMoreTreeRoot,
        onLoadMoreSearch,
      }),
    [
      unavailable,
      selectedFilePath,
      searchQuery,
      searchActiveIndex,
      searchResult,
      searchLoading,
      searchError,
      searchMode,
      treeLoading,
      treeError,
      treeNodes,
      rootTreeHasMore,
      searchHasMore,
      onSearchQueryChange,
      onSearchMove,
      onSearchConfirm,
      onToggleDirectory,
      onSelectFile,
      onOpenFileModal,
      onLoadMoreTreeRoot,
      onLoadMoreSearch,
    ],
  );

  const fileContentModalProps = useMemo(
    () =>
      buildFileContentModalProps({
        fileModalOpen,
        fileModalPath,
        fileModalLoading,
        fileModalError,
        fileModalFile,
        fileModalMarkdownViewMode,
        fileModalShowLineNumbers,
        fileModalCopiedPath,
        fileModalCopyError,
        fileModalHighlightLine,
        resolvedTheme,
        onCloseFileModal,
        onToggleFileModalLineNumbers,
        onCopyFileModalPath,
        onSetFileModalMarkdownViewMode,
      }),
    [
      fileModalOpen,
      fileModalPath,
      fileModalLoading,
      fileModalError,
      fileModalFile,
      fileModalMarkdownViewMode,
      fileModalShowLineNumbers,
      fileModalCopiedPath,
      fileModalCopyError,
      fileModalHighlightLine,
      resolvedTheme,
      onCloseFileModal,
      onToggleFileModalLineNumbers,
      onCopyFileModalPath,
      onSetFileModalMarkdownViewMode,
    ],
  );

  const handleResolveFileReference = useCallback(
    (rawToken: string) =>
      onResolveLogFileReference({
        rawToken,
        sourcePaneId: paneId,
        sourceRepoRoot,
      }),
    [onResolveLogFileReference, paneId, sourceRepoRoot],
  );

  const handleResolveFileReferenceCandidates = useCallback(
    (rawTokens: string[]) =>
      onResolveLogFileReferenceCandidates({
        rawTokens,
        sourcePaneId: paneId,
        sourceRepoRoot,
      }),
    [onResolveLogFileReferenceCandidates, paneId, sourceRepoRoot],
  );

  const screenPanelProps = useMemo(
    () =>
      buildScreenPanelProps({
        mode,
        connectionIssue,
        fallbackReason,
        error,
        pollingPauseReason,
        contextLeftLabel,
        isScreenLoading,
        imageBase64,
        screenLines,
        virtuosoRef,
        scrollerRef,
        isAtBottom,
        forceFollow,
        rawMode,
        allowDangerKeys,
        fileResolveError,
        handleModeChange,
        handleRefreshScreen,
        handleAtBottomChange,
        scrollToBottom,
        handleUserScrollStateChange,
        onResolveFileReference: handleResolveFileReference,
        onResolveFileReferenceCandidates: handleResolveFileReferenceCandidates,
      }),
    [
      mode,
      connectionIssue,
      fallbackReason,
      error,
      pollingPauseReason,
      contextLeftLabel,
      isScreenLoading,
      imageBase64,
      screenLines,
      virtuosoRef,
      scrollerRef,
      isAtBottom,
      forceFollow,
      rawMode,
      allowDangerKeys,
      fileResolveError,
      handleModeChange,
      handleRefreshScreen,
      handleAtBottomChange,
      scrollToBottom,
      handleUserScrollStateChange,
      handleResolveFileReference,
      handleResolveFileReferenceCandidates,
    ],
  );

  const logFileCandidateModalProps = useMemo(
    () =>
      buildLogFileCandidateModalProps({
        logFileCandidateModalOpen,
        logFileCandidateReference,
        logFileCandidateItems,
        onCloseLogFileCandidateModal,
        onSelectLogFileCandidate,
      }),
    [
      logFileCandidateModalOpen,
      logFileCandidateReference,
      logFileCandidateItems,
      onCloseLogFileCandidateModal,
      onSelectLogFileCandidate,
    ],
  );

  return {
    fileNavigatorSectionProps,
    fileContentModalProps,
    screenPanelProps,
    logFileCandidateModalProps,
  };
};
