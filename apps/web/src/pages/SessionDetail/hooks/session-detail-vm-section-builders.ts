import type {
  HighlightCorrectionConfig,
  ScreenResponse,
  SessionStateTimeline,
  SessionStateTimelineRange,
  SessionSummary,
} from "@vde-monitor/shared";
import type { PointerEvent, RefObject } from "react";

import type { SessionGroup } from "@/lib/session-group";
import type { Theme } from "@/lib/theme";

type BuildTimelineSectionArgs = {
  timeline: SessionStateTimeline | null;
  timelineRange: SessionStateTimelineRange;
  timelineError: string | null;
  timelineLoading: boolean;
  timelineExpanded: boolean;
  isMobile: boolean;
  setTimelineRange: (range: SessionStateTimelineRange) => void;
  toggleTimelineExpanded: () => void;
  refreshTimeline: () => void;
};

type BuildMetaSectionArgs = {
  paneId: string;
  session: SessionSummary | null;
  nowMs: number;
  connected: boolean;
  connectionIssue: string | null;
};

type BuildSidebarSectionArgs = {
  sessionGroups: SessionGroup[];
  getRepoSortAnchorAt: (repoRoot: string | null) => number | null;
  connected: boolean;
  connectionIssue: string | null;
  requestStateTimeline: (
    paneId: string,
    options?: { range?: SessionStateTimelineRange; limit?: number },
  ) => Promise<SessionStateTimeline>;
  requestScreen: (
    paneId: string,
    options: { lines?: number; mode?: "text" | "image"; cursor?: string },
  ) => Promise<ScreenResponse>;
  highlightCorrections: HighlightCorrectionConfig;
  resolvedTheme: Theme;
};

type BuildLayoutSectionArgs = {
  is2xlUp: boolean;
  sidebarWidth: number;
  handleSidebarPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  detailSplitRatio: number;
  detailSplitRef: RefObject<HTMLDivElement | null>;
  handleDetailSplitPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
};

type BuildLogsSectionArgs = {
  quickPanelOpen: boolean;
  logModalOpen: boolean;
  selectedSession: SessionSummary | null;
  selectedLogLines: string[];
  selectedLogLoading: boolean;
  selectedLogError: string | null;
  openLogModal: (paneId: string) => void;
  closeLogModal: () => void;
  toggleQuickPanel: () => void;
  closeQuickPanel: () => void;
};

type BuildTitleSectionArgs = {
  titleDraft: string;
  titleEditing: boolean;
  titleSaving: boolean;
  titleError: string | null;
  openTitleEditor: () => void;
  closeTitleEditor: () => void;
  updateTitleDraft: (value: string) => void;
  saveTitle: () => void;
  resetTitle: () => void;
};

type BuildActionsSectionArgs = {
  handleFocusPane: (targetPaneId: string) => Promise<void>;
  handleTouchPaneWithRepoAnchor: (targetPaneId: string) => void;
  handleTouchRepoPin: (repoRoot: string | null) => void;
  handleOpenPaneHere: (targetPaneId: string) => void;
  handleOpenHere: () => void;
  handleOpenInNewTab: () => void;
};

export const buildTimelineSection = ({
  timeline,
  timelineRange,
  timelineError,
  timelineLoading,
  timelineExpanded,
  isMobile,
  setTimelineRange,
  toggleTimelineExpanded,
  refreshTimeline,
}: BuildTimelineSectionArgs) => ({
  timeline,
  timelineRange,
  timelineError,
  timelineLoading,
  timelineExpanded,
  isMobile,
  setTimelineRange,
  toggleTimelineExpanded,
  refreshTimeline,
});

export const buildMetaSection = ({
  paneId,
  session,
  nowMs,
  connected,
  connectionIssue,
}: BuildMetaSectionArgs) => ({
  paneId,
  session,
  nowMs,
  connected,
  connectionIssue,
});

export const buildSidebarSection = ({
  sessionGroups,
  getRepoSortAnchorAt,
  connected,
  connectionIssue,
  requestStateTimeline,
  requestScreen,
  highlightCorrections,
  resolvedTheme,
}: BuildSidebarSectionArgs) => ({
  sessionGroups,
  getRepoSortAnchorAt,
  connected,
  connectionIssue,
  requestStateTimeline,
  requestScreen,
  highlightCorrections,
  resolvedTheme,
});

export const buildLayoutSection = ({
  is2xlUp,
  sidebarWidth,
  handleSidebarPointerDown,
  detailSplitRatio,
  detailSplitRef,
  handleDetailSplitPointerDown,
}: BuildLayoutSectionArgs) => ({
  is2xlUp,
  sidebarWidth,
  handleSidebarPointerDown,
  detailSplitRatio,
  detailSplitRef,
  handleDetailSplitPointerDown,
});

export const buildLogsSection = ({
  quickPanelOpen,
  logModalOpen,
  selectedSession,
  selectedLogLines,
  selectedLogLoading,
  selectedLogError,
  openLogModal,
  closeLogModal,
  toggleQuickPanel,
  closeQuickPanel,
}: BuildLogsSectionArgs) => ({
  quickPanelOpen,
  logModalOpen,
  selectedSession,
  selectedLogLines,
  selectedLogLoading,
  selectedLogError,
  openLogModal,
  closeLogModal,
  toggleQuickPanel,
  closeQuickPanel,
});

export const buildTitleSection = ({
  titleDraft,
  titleEditing,
  titleSaving,
  titleError,
  openTitleEditor,
  closeTitleEditor,
  updateTitleDraft,
  saveTitle,
  resetTitle,
}: BuildTitleSectionArgs) => ({
  titleDraft,
  titleEditing,
  titleSaving,
  titleError,
  openTitleEditor,
  closeTitleEditor,
  updateTitleDraft,
  saveTitle,
  resetTitle,
});

export const buildActionsSection = ({
  handleFocusPane,
  handleTouchPaneWithRepoAnchor,
  handleTouchRepoPin,
  handleOpenPaneHere,
  handleOpenHere,
  handleOpenInNewTab,
}: BuildActionsSectionArgs) => ({
  handleFocusPane,
  handleTouchPane: handleTouchPaneWithRepoAnchor,
  handleTouchRepoPin,
  handleOpenPaneHere,
  handleOpenHere,
  handleOpenInNewTab,
});
