import { describe, expect, it } from "vitest";

import { applyAdjacentBackgroundPadding } from "./ansi-background-padding";

describe("applyAdjacentBackgroundPadding", () => {
  it("fills prompt block lines using next available background color", () => {
    const htmlLines = [
      "<span>› run</span>",
      '<span style="background-color:#ff0000">  command</span>',
      "<span></span>",
    ];
    const rawLines = ["› run", "\u001b[41m  command\u001b[0m", ""];

    const result = applyAdjacentBackgroundPadding(htmlLines, rawLines);

    expect(result[0]).toContain("background-color:#ff0000");
    expect(result[2]).toContain("background-color:#ff0000");
  });

  it("stops prompt padding at non-indented output lines", () => {
    const htmlLines = [
      '<span style="background-color:#00aa00">› run</span>',
      "<span>  continued</span>",
      "<span>output</span>",
      "<span></span>",
    ];
    const rawLines = ["› run", "  continued", "output", ""];

    const result = applyAdjacentBackgroundPadding(htmlLines, rawLines);

    expect(result[1]).toContain("background-color:#00aa00");
    expect(result[2]).not.toContain("display:block; width:100%;");
    expect(result[3]).not.toContain("display:block; width:100%;");
  });

  it("pads only one trailing empty line in non-prompt segments", () => {
    const htmlLines = [
      '<span style="background-color:#112233">line</span>',
      "<span></span>",
      "<span></span>",
    ];
    const rawLines = ["line", "", ""];

    const result = applyAdjacentBackgroundPadding(htmlLines, rawLines);

    expect(result[1]).toContain("background-color:#112233");
    expect(result[2]).not.toContain("display:block; width:100%;");
  });

  it("keeps empty lines padded when another background line follows in segment", () => {
    const htmlLines = [
      '<span style="background-color:#334455">A</span>',
      "<span></span>",
      "<span></span>",
      '<span style="background-color:#334455">B</span>',
    ];
    const rawLines = ["A", "", "", "B"];

    const result = applyAdjacentBackgroundPadding(htmlLines, rawLines);

    expect(result[1]).toContain("background-color:#334455");
    expect(result[2]).toContain("background-color:#334455");
  });
});
