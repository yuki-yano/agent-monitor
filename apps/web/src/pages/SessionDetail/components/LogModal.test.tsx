// @vitest-environment happy-dom
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { createSessionDetail } from "../test-helpers";
import { LogModal } from "./LogModal";

vi.mock("react-virtuoso", () => ({
  Virtuoso: ({
    data = [],
    itemContent,
  }: {
    data?: string[];
    itemContent: (index: number, item: string) => ReactNode;
  }) => (
    <div data-testid="virtuoso">
      {data.map((item, index) => (
        <div key={index}>{itemContent(index, item)}</div>
      ))}
    </div>
  ),
}));

describe("LogModal", () => {
  it("returns null when closed", () => {
    const { container } = render(
      <LogModal
        open={false}
        session={createSessionDetail()}
        logLines={[]}
        loading={false}
        error={null}
        onClose={vi.fn()}
        onOpenHere={vi.fn()}
        onOpenNewTab={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders log modal content and handles actions", () => {
    const onClose = vi.fn();
    const onOpenHere = vi.fn();
    const onOpenNewTab = vi.fn();
    const session = createSessionDetail({ customTitle: "Custom" });
    render(
      <LogModal
        open
        session={session}
        logLines={["line1"]}
        loading
        error="Log error"
        onClose={onClose}
        onOpenHere={onOpenHere}
        onOpenNewTab={onOpenNewTab}
      />,
    );

    expect(screen.getByText("Custom")).toBeTruthy();
    expect(screen.getByText("Log error")).toBeTruthy();
    expect(screen.getByText("Loading log...")).toBeTruthy();

    fireEvent.click(screen.getByLabelText("Close log"));
    expect(onClose).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText("Open here"));
    expect(onOpenHere).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText("Open in new tab"));
    expect(onOpenNewTab).toHaveBeenCalled();
  });
});
