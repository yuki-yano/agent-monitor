import { describe, expect, it } from "vitest";

import { buildTerminalBoundsScript, parseBoundsSet } from "./macos-bounds";

describe("parseBoundsSet", () => {
  it("parses content and window bounds", () => {
    const input = "1, 2, 3, 4|5, 6, 7, 8";
    const result = parseBoundsSet(input);
    expect(result.content).toEqual({ x: 1, y: 2, width: 3, height: 4 });
    expect(result.window).toEqual({ x: 5, y: 6, width: 7, height: 8 });
  });

  it("falls back to content bounds when window is missing", () => {
    const input = "1, 2, 3, 4";
    const result = parseBoundsSet(input);
    expect(result.window).toEqual({ x: 1, y: 2, width: 3, height: 4 });
  });

  it("drops invalid bounds with non-positive size", () => {
    const input = "1, 2, 0, 4|5, 6, 7, 8";
    const result = parseBoundsSet(input);
    expect(result.content).toBeNull();
    expect(result.window).toEqual({ x: 5, y: 6, width: 7, height: 8 });
  });
});

describe("buildTerminalBoundsScript", () => {
  it("prefers the largest AXScrollArea instead of the first element", () => {
    const script = buildTerminalBoundsScript("Alacritty");

    expect(script).toContain('every UI element of targetWindow whose role is "AXScrollArea"');
    expect(script).toContain("repeat with candidate in scrollAreas");
    expect(script).toContain("if candidateArea > bestArea then");
  });

  it("skips non-standard front windows like AXDialog and picks a standard window", () => {
    const script = buildTerminalBoundsScript("Alacritty");

    expect(script).toContain("set targetWindow to front window");
    expect(script).toContain('set targetSubrole to value of attribute "AXSubrole" of targetWindow');
    expect(script).toContain('if targetSubrole is not "AXStandardWindow" then');
    expect(script).toContain(
      'set candidateSubrole to value of attribute "AXSubrole" of candidateWindow',
    );
    expect(script).toContain(
      'if (candidateSubrole is "AXStandardWindow") and (isMinimized is false) then',
    );
  });
});
