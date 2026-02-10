import { describe, expect, it, vi } from "vitest";

const runGitMock = vi.fn();

vi.mock("../git-utils", () => ({
  runGit: runGitMock,
}));

const loadModule = async () => {
  await vi.resetModules();
  runGitMock.mockReset();
  return import("./repo-branch");
};

describe("resolveRepoBranchCached", () => {
  it("returns null for missing cwd", async () => {
    const { resolveRepoBranchCached } = await loadModule();
    const result = await resolveRepoBranchCached(null);
    expect(result).toBeNull();
    expect(runGitMock).not.toHaveBeenCalled();
  });

  it("caches by normalized path", async () => {
    const { resolveRepoBranchCached } = await loadModule();
    runGitMock.mockResolvedValue("main\n");
    const first = await resolveRepoBranchCached("/repo/");
    const second = await resolveRepoBranchCached("/repo");
    expect(first).toBe("main");
    expect(second).toBe("main");
    expect(runGitMock).toHaveBeenCalledTimes(1);
    expect(runGitMock).toHaveBeenCalledWith(
      "/repo",
      ["branch", "--show-current"],
      expect.objectContaining({
        timeoutMs: 2000,
        maxBuffer: 2_000_000,
        allowStdoutOnError: false,
      }),
    );
  });

  it("returns null when git command fails", async () => {
    const { resolveRepoBranchCached } = await loadModule();
    runGitMock.mockRejectedValue(new Error("not git repo"));
    const result = await resolveRepoBranchCached("/not-repo");
    expect(result).toBeNull();
  });
});
