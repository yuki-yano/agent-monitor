// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createCommitDetail, createCommitFileDiff, createCommitLog } from "../test-helpers";
import { useSessionCommits } from "./useSessionCommits";

describe("useSessionCommits", () => {
  it("loads commit log on mount", async () => {
    const commitLog = createCommitLog();
    const requestCommitLog = vi.fn().mockResolvedValue(commitLog);
    const requestCommitDetail = vi.fn().mockResolvedValue(createCommitDetail());
    const requestCommitFile = vi.fn().mockResolvedValue(createCommitFileDiff());

    const { result } = renderHook(() =>
      useSessionCommits({
        paneId: "pane-1",
        connected: true,
        requestCommitLog,
        requestCommitDetail,
        requestCommitFile,
      }),
    );

    await waitFor(() => {
      expect(result.current.commitLog).not.toBeNull();
    });

    expect(requestCommitLog).toHaveBeenCalledWith("pane-1", {
      limit: 10,
      skip: 0,
      force: true,
    });
  });

  it("loads commit detail on toggle", async () => {
    const commitLog = createCommitLog();
    const requestCommitLog = vi.fn().mockResolvedValue(commitLog);
    const requestCommitDetail = vi.fn().mockResolvedValue(createCommitDetail());
    const requestCommitFile = vi.fn().mockResolvedValue(createCommitFileDiff());

    const { result } = renderHook(() =>
      useSessionCommits({
        paneId: "pane-1",
        connected: true,
        requestCommitLog,
        requestCommitDetail,
        requestCommitFile,
      }),
    );

    await waitFor(() => {
      expect(result.current.commitLog).not.toBeNull();
    });

    act(() => {
      result.current.toggleCommit("abc123");
    });

    await waitFor(() => {
      expect(requestCommitDetail).toHaveBeenCalledWith("pane-1", "abc123", { force: true });
    });
  });

  it("copies commit hash to clipboard", async () => {
    const commitLog = createCommitLog();
    const requestCommitLog = vi.fn().mockResolvedValue(commitLog);
    const requestCommitDetail = vi.fn().mockResolvedValue(createCommitDetail());
    const requestCommitFile = vi.fn().mockResolvedValue(createCommitFileDiff());
    const writeText = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    const { result } = renderHook(() =>
      useSessionCommits({
        paneId: "pane-1",
        connected: true,
        requestCommitLog,
        requestCommitDetail,
        requestCommitFile,
      }),
    );

    await act(async () => {
      await result.current.copyHash("abc123");
    });

    expect(writeText).toHaveBeenCalledWith("abc123");
  });
});
