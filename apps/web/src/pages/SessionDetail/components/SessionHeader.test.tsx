// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "@/state/theme-context";

import { createSessionDetail } from "../test-helpers";
import { SessionHeader } from "./SessionHeader";

describe("SessionHeader", () => {
  const Wrapper = ({ children }: PropsWithChildren) => (
    <ThemeProvider>
      <MemoryRouter>{children}</MemoryRouter>
    </ThemeProvider>
  );

  it("renders session title and metadata", () => {
    const session = createSessionDetail({ customTitle: "Custom Title" });
    render(
      <SessionHeader
        session={session}
        readOnly={false}
        connectionIssue={null}
        nowMs={Date.now()}
        titleDraft="Custom Title"
        titleEditing={false}
        titleSaving={false}
        titleError={null}
        onTitleDraftChange={vi.fn()}
        onTitleSave={vi.fn()}
        onTitleClear={vi.fn()}
        onOpenTitleEditor={vi.fn()}
        onCloseTitleEditor={vi.fn()}
      />,
      { wrapper: Wrapper },
    );

    const titleButton = screen.getByRole("button", { name: "Edit session title" });
    expect(titleButton.textContent).toContain("Custom Title");
    expect(screen.getByText("Session session-1")).toBeTruthy();
    expect(screen.getByText("Window 1")).toBeTruthy();
    expect(screen.getByText("Pane pane-1")).toBeTruthy();
    expect(screen.getByText("RUNNING")).toBeTruthy();
  });

  it("handles title editing interactions", () => {
    const session = createSessionDetail({ customTitle: "Custom Title" });
    const onTitleDraftChange = vi.fn();
    const onTitleSave = vi.fn();
    const onCloseTitleEditor = vi.fn();

    render(
      <SessionHeader
        session={session}
        readOnly={false}
        connectionIssue={null}
        nowMs={Date.now()}
        titleDraft="Custom Title"
        titleEditing
        titleSaving={false}
        titleError={null}
        onTitleDraftChange={onTitleDraftChange}
        onTitleSave={onTitleSave}
        onTitleClear={vi.fn()}
        onOpenTitleEditor={vi.fn()}
        onCloseTitleEditor={onCloseTitleEditor}
      />,
      { wrapper: Wrapper },
    );

    const input = screen.getByLabelText("Custom session title");
    fireEvent.change(input, { target: { value: "Updated Title" } });
    expect(onTitleDraftChange).toHaveBeenCalledWith("Updated Title");

    fireEvent.keyDown(input, { key: "Enter" });
    expect(onTitleSave).toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Escape" });
    expect(onCloseTitleEditor).toHaveBeenCalled();
  });

  it("disables title editing when read-only", () => {
    const session = createSessionDetail({ customTitle: "Custom Title" });
    const onOpenTitleEditor = vi.fn();
    render(
      <SessionHeader
        session={session}
        readOnly
        connectionIssue={null}
        nowMs={Date.now()}
        titleDraft="Custom Title"
        titleEditing={false}
        titleSaving={false}
        titleError={null}
        onTitleDraftChange={vi.fn()}
        onTitleSave={vi.fn()}
        onTitleClear={vi.fn()}
        onOpenTitleEditor={onOpenTitleEditor}
        onCloseTitleEditor={vi.fn()}
      />,
      { wrapper: Wrapper },
    );

    const titleButton = screen.getByRole("button", { name: "Edit session title" });
    expect((titleButton as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(titleButton);
    expect(onOpenTitleEditor).not.toHaveBeenCalled();
  });

  it("renders alerts when read-only, pipe conflict, or connection issue", () => {
    const session = createSessionDetail({ pipeConflict: true });
    render(
      <SessionHeader
        session={session}
        readOnly
        connectionIssue="Connection lost"
        nowMs={Date.now()}
        titleDraft="Custom Title"
        titleEditing={false}
        titleSaving={false}
        titleError="Title error"
        onTitleDraftChange={vi.fn()}
        onTitleSave={vi.fn()}
        onTitleClear={vi.fn()}
        onOpenTitleEditor={vi.fn()}
        onCloseTitleEditor={vi.fn()}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText("Read-only mode is active. Actions are disabled.")).toBeTruthy();
    expect(screen.getByText("Another pipe-pane is attached. Screen is capture-only.")).toBeTruthy();
    expect(screen.getByText("Connection lost")).toBeTruthy();
    expect(screen.getByText("Title error")).toBeTruthy();
  });
});
