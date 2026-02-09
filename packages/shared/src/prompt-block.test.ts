import { describe, expect, it } from "vitest";

import { collectPromptBlockRanges, findPromptBlockEnd } from "./prompt-block";
import { isPromptStartLine } from "./prompt-start";

describe("prompt-block", () => {
  it("collects prompt ranges split by non-indented output", () => {
    const lines = ["› run", "  --fix", "", "output", "› next", "  --all"];
    const ranges = collectPromptBlockRanges({
      lines,
      isPromptStart: (line) => isPromptStartLine(line, "codex"),
    });
    expect(ranges).toEqual([
      { start: 0, endExclusive: 3 },
      { start: 4, endExclusive: 6 },
    ]);
  });

  it("treats next prompt marker as the block boundary", () => {
    const lines = ["❯ first", "  detail", "❯ second", "  more"];
    const endExclusive = findPromptBlockEnd({
      lines,
      start: 0,
      isPromptStart: (line) => isPromptStartLine(line, "claude"),
    });
    expect(endExclusive).toBe(2);
  });

  it("keeps indented and blank lines in the same block", () => {
    const lines = ["› run", "\u00A0continuation", "   ", "\tflag"];
    const ranges = collectPromptBlockRanges({
      lines,
      isPromptStart: (line) => isPromptStartLine(line, "codex"),
    });
    expect(ranges).toEqual([{ start: 0, endExclusive: 4 }]);
  });

  it("returns empty ranges when no prompt markers exist", () => {
    const lines = ["output", "done"];
    const ranges = collectPromptBlockRanges({
      lines,
      isPromptStart: (line) => isPromptStartLine(line, "codex"),
    });
    expect(ranges).toEqual([]);
  });
});
