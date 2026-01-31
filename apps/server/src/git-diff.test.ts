import { describe, expect, it } from "vitest";

import { parseGitStatus } from "./git-diff.js";

const parseNumstatLineForTest = (output: string) => {
  const line = output
    .split("\n")
    .map((value) => value.trim())
    .find((value) => value.length > 0);
  if (!line) {
    return null;
  }
  const parts = line.split("\t");
  if (parts.length < 2) {
    return null;
  }
  const addRaw = parts[0] ?? "";
  const delRaw = parts[1] ?? "";
  const additions = addRaw === "-" ? null : Number.parseInt(addRaw, 10);
  const deletions = delRaw === "-" ? null : Number.parseInt(delRaw, 10);
  return {
    additions: Number.isFinite(additions) ? additions : null,
    deletions: Number.isFinite(deletions) ? deletions : null,
  };
};

describe("parseGitStatus", () => {
  it("parses basic status entries", () => {
    const output = [" M file.txt", "A  added.md", "?? new.log", ""].join("\0");
    const result = parseGitStatus(output);
    expect(result).toEqual([
      { path: "file.txt", status: "M", staged: false },
      { path: "added.md", status: "A", staged: true },
      { path: "new.log", status: "?", staged: false },
    ]);
  });

  it("parses rename entries", () => {
    const output = ["R  old-name.ts", "new-name.ts", ""].join("\0");
    const result = parseGitStatus(output);
    expect(result).toEqual([
      { path: "new-name.ts", status: "R", staged: true, renamedFrom: "old-name.ts" },
    ]);
  });
});

describe("parseNumstatLine (internal)", () => {
  it("parses numeric additions/deletions", () => {
    const output = "12\t3\tsrc/app.ts\n";
    expect(parseNumstatLineForTest(output)).toEqual({ additions: 12, deletions: 3 });
  });

  it("returns nulls for binary markers", () => {
    const output = "-\t-\tassets/logo.png\n";
    expect(parseNumstatLineForTest(output)).toEqual({ additions: null, deletions: null });
  });

  it("handles no-index numstat output", () => {
    const output = "5\t0\t/tmp/file.txt\n";
    expect(parseNumstatLineForTest(output)).toEqual({ additions: 5, deletions: 0 });
  });

  it("ignores empty output", () => {
    expect(parseNumstatLineForTest("")).toBeNull();
  });
});
