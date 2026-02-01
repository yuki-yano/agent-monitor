// @vitest-environment happy-dom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createSessionDetail } from "../test-helpers";
import { QuickPanel } from "./QuickPanel";

describe("QuickPanel", () => {
  it("renders toggle button when closed", () => {
    const onToggle = vi.fn();
    render(
      <QuickPanel
        open={false}
        sessionGroups={[]}
        nowMs={Date.now()}
        onOpenLogModal={vi.fn()}
        onClose={vi.fn()}
        onToggle={onToggle}
      />,
    );

    fireEvent.click(screen.getByLabelText("Toggle session quick panel"));
    expect(onToggle).toHaveBeenCalled();
  });

  it("renders empty state when no sessions", () => {
    render(
      <QuickPanel
        open
        sessionGroups={[]}
        nowMs={Date.now()}
        onOpenLogModal={vi.fn()}
        onClose={vi.fn()}
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByText("No sessions available.")).toBeTruthy();
  });

  it("opens log modal for selected session", () => {
    const session = createSessionDetail();
    const onOpenLogModal = vi.fn();
    render(
      <QuickPanel
        open
        sessionGroups={[
          {
            repoRoot: session.repoRoot,
            sessions: [session],
            lastInputAt: session.lastInputAt,
          },
        ]}
        nowMs={Date.now()}
        onOpenLogModal={onOpenLogModal}
        onClose={vi.fn()}
        onToggle={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("Session Title"));
    expect(onOpenLogModal).toHaveBeenCalledWith("pane-1");
  });
});
