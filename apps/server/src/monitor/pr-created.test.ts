import { describe, expect, it, vi } from "vitest";

const execaMock = vi.fn();

vi.mock("execa", () => ({
  execa: execaMock,
}));

const loadModule = async () => {
  await vi.resetModules();
  execaMock.mockReset();
  return import("./pr-created");
};

describe("resolvePrCreatedCached", () => {
  it("returns null when repoRoot or branch is missing", async () => {
    const { resolvePrCreatedCached } = await loadModule();
    expect(await resolvePrCreatedCached(null, "feature/foo")).toBeNull();
    expect(await resolvePrCreatedCached("/repo", null)).toBeNull();
    expect(execaMock).not.toHaveBeenCalled();
  });

  it("returns true when gh finds PR for branch", async () => {
    const { resolvePrCreatedCached } = await loadModule();
    execaMock.mockResolvedValueOnce({
      exitCode: 0,
      stdout: JSON.stringify([{ headRefName: "feature/foo", number: 123 }]),
    });
    const result = await resolvePrCreatedCached("/repo", "feature/foo");
    expect(result).toBe(true);
    expect(execaMock).toHaveBeenCalledWith(
      "gh",
      ["pr", "list", "--state", "all", "--limit", "1000", "--json", "headRefName"],
      expect.objectContaining({ cwd: "/repo" }),
    );
  });

  it("reuses repo snapshot across branches", async () => {
    const { resolvePrCreatedCached } = await loadModule();
    execaMock.mockResolvedValueOnce({
      exitCode: 0,
      stdout: JSON.stringify([{ headRefName: "feature/bar", number: 101 }]),
    });
    const first = await resolvePrCreatedCached("/repo", "feature/bar");
    const second = await resolvePrCreatedCached("/repo", "feature/baz");
    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(execaMock).toHaveBeenCalledTimes(1);
  });
});
