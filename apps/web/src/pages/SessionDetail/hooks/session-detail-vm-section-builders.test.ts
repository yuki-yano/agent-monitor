import type {
  ScreenResponse,
  SessionStateTimeline,
  SessionStateTimelineRange,
} from "@vde-monitor/shared";
import { describe, expect, it, vi } from "vitest";

import {
  buildActionsSection,
  buildLayoutSection,
  buildLogsSection,
  buildMetaSection,
  buildSidebarSection,
  buildTimelineSection,
  buildTitleSection,
} from "./session-detail-vm-section-builders";

describe("session detail vm section builders", () => {
  it("builds timeline/logs/title/actions sections", () => {
    const handleSidebarPointerDown = vi.fn();
    const handleDetailSplitPointerDown = vi.fn();
    const setTimelineRange = vi.fn();
    const toggleTimelineExpanded = vi.fn();
    const refreshTimeline = vi.fn();
    const openLogModal = vi.fn();
    const closeLogModal = vi.fn();
    const toggleQuickPanel = vi.fn();
    const closeQuickPanel = vi.fn();
    const openTitleEditor = vi.fn();
    const closeTitleEditor = vi.fn();
    const updateTitleDraft = vi.fn();
    const saveTitle = vi.fn();
    const resetTitle = vi.fn();
    const handleFocusPane = vi.fn(async () => undefined);
    const handleTouchPaneWithRepoAnchor = vi.fn();
    const handleTouchRepoPin = vi.fn();
    const handleOpenPaneHere = vi.fn();
    const handleOpenHere = vi.fn();
    const handleOpenInNewTab = vi.fn();
    const getRepoSortAnchorAt = vi.fn(() => null);
    const requestStateTimeline = vi.fn() as unknown as (
      paneId: string,
      options?: { range?: SessionStateTimelineRange; limit?: number },
    ) => Promise<SessionStateTimeline>;
    const requestScreen = vi.fn() as unknown as (
      paneId: string,
      options: { lines?: number; mode?: "text" | "image"; cursor?: string },
    ) => Promise<ScreenResponse>;

    const meta = buildMetaSection({
      paneId: "pane-1",
      session: null,
      nowMs: 123,
      connected: true,
      connectionIssue: null,
    });
    expect(meta.paneId).toBe("pane-1");
    expect(meta.nowMs).toBe(123);

    const sidebar = buildSidebarSection({
      sessionGroups: [],
      getRepoSortAnchorAt,
      connected: true,
      connectionIssue: null,
      requestStateTimeline,
      requestScreen,
      highlightCorrections: { codex: true, claude: false },
      resolvedTheme: "latte",
    });
    expect(sidebar.getRepoSortAnchorAt).toBe(getRepoSortAnchorAt);
    expect(sidebar.resolvedTheme).toBe("latte");

    const layout = buildLayoutSection({
      is2xlUp: true,
      sidebarWidth: 280,
      handleSidebarPointerDown,
      detailSplitRatio: 0.5,
      detailSplitRef: { current: null },
      handleDetailSplitPointerDown,
    });
    expect(layout.sidebarWidth).toBe(280);
    expect(layout.handleDetailSplitPointerDown).toBe(handleDetailSplitPointerDown);

    const timeline = buildTimelineSection({
      timeline: null,
      timelineRange: "1h",
      timelineError: null,
      timelineLoading: false,
      timelineExpanded: true,
      isMobile: false,
      setTimelineRange,
      toggleTimelineExpanded,
      refreshTimeline,
    });
    expect(timeline.timelineRange).toBe("1h");
    expect(timeline.setTimelineRange).toBe(setTimelineRange);

    const logs = buildLogsSection({
      quickPanelOpen: false,
      logModalOpen: true,
      selectedSession: null,
      selectedLogLines: ["line"],
      selectedLogLoading: false,
      selectedLogError: null,
      openLogModal,
      closeLogModal,
      toggleQuickPanel,
      closeQuickPanel,
    });
    expect(logs.selectedLogLines).toEqual(["line"]);
    expect(logs.openLogModal).toBe(openLogModal);

    const title = buildTitleSection({
      titleDraft: "draft",
      titleEditing: false,
      titleSaving: false,
      titleError: null,
      openTitleEditor,
      closeTitleEditor,
      updateTitleDraft,
      saveTitle,
      resetTitle,
    });
    expect(title.titleDraft).toBe("draft");
    expect(title.saveTitle).toBe(saveTitle);

    const actions = buildActionsSection({
      handleFocusPane,
      handleTouchPaneWithRepoAnchor,
      handleTouchRepoPin,
      handleOpenPaneHere,
      handleOpenHere,
      handleOpenInNewTab,
    });
    expect(actions.handleTouchPane).toBe(handleTouchPaneWithRepoAnchor);
    expect(actions.handleOpenInNewTab).toBe(handleOpenInNewTab);
  });
});
