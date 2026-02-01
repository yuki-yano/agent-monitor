// @vitest-environment happy-dom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createDiffFile, createDiffSummary } from "../test-helpers";
import { DiffSection } from "./DiffSection";

describe("DiffSection", () => {
  it("renders diff summary and handles toggle", () => {
    const diffSummary = createDiffSummary();
    const onToggle = vi.fn();
    render(
      <DiffSection
        diffSummary={diffSummary}
        diffError={null}
        diffLoading={false}
        diffFiles={{}}
        diffOpen={{}}
        diffLoadingFiles={{}}
        onRefresh={vi.fn()}
        onToggle={onToggle}
      />,
    );

    expect(screen.getByText("Changes")).toBeTruthy();
    expect(screen.getByText("src/index.ts")).toBeTruthy();
    expect(screen.getAllByText("+1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("-0").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText("src/index.ts"));
    expect(onToggle).toHaveBeenCalledWith("src/index.ts");
  });

  it("renders clean state and error message", () => {
    render(
      <DiffSection
        diffSummary={createDiffSummary({ files: [] })}
        diffError="Diff error"
        diffLoading={false}
        diffFiles={{}}
        diffOpen={{}}
        diffLoadingFiles={{}}
        onRefresh={vi.fn()}
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByText("Working directory is clean")).toBeTruthy();
    expect(screen.getByText("+0")).toBeTruthy();
    expect(screen.getByText("-0")).toBeTruthy();
    expect(screen.getByText("Diff error")).toBeTruthy();
  });

  it("shows patch content when open", () => {
    const diffSummary = createDiffSummary();
    const diffFile = createDiffFile({ patch: "+hello\n-world" });
    render(
      <DiffSection
        diffSummary={diffSummary}
        diffError={null}
        diffLoading={false}
        diffFiles={{ "src/index.ts": diffFile }}
        diffOpen={{ "src/index.ts": true }}
        diffLoadingFiles={{}}
        onRefresh={vi.fn()}
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByText("+hello")).toBeTruthy();
    expect(screen.getByText("-world")).toBeTruthy();
  });
});
