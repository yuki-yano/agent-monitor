// @vitest-environment happy-dom
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createDiffFile, createDiffSummary } from "../test-helpers";
import { useSessionDiffs } from "./useSessionDiffs";

describe("useSessionDiffs", () => {
  it("loads diff summary on mount", async () => {
    const diffSummary = createDiffSummary();
    const requestDiffSummary = vi.fn().mockResolvedValue(diffSummary);
    const requestDiffFile = vi.fn().mockResolvedValue(createDiffFile());

    const { result } = renderHook(() =>
      useSessionDiffs({
        paneId: "pane-1",
        connected: true,
        requestDiffSummary,
        requestDiffFile,
      }),
    );

    await waitFor(() => {
      expect(result.current.diffSummary).not.toBeNull();
    });

    expect(requestDiffSummary).toHaveBeenCalledWith("pane-1", { force: true });
  });

  it("loads diff file when toggled open", async () => {
    const diffSummary = createDiffSummary();
    const requestDiffSummary = vi.fn().mockResolvedValue(diffSummary);
    const requestDiffFile = vi.fn().mockResolvedValue(createDiffFile());

    const { result } = renderHook(() =>
      useSessionDiffs({
        paneId: "pane-1",
        connected: true,
        requestDiffSummary,
        requestDiffFile,
      }),
    );

    await waitFor(() => {
      expect(result.current.diffSummary).not.toBeNull();
    });

    result.current.toggleDiff("src/index.ts");

    await waitFor(() => {
      expect(requestDiffFile).toHaveBeenCalledWith("pane-1", "src/index.ts", "HEAD", {
        force: true,
      });
    });
  });
});
