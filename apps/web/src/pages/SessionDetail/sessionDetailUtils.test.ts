import { describe, expect, it } from "vitest";

import { extractCodexContextLeft } from "./sessionDetailUtils";

describe("extractCodexContextLeft", () => {
  it("keeps extracting the latest 'context left' label", () => {
    const input = "91% context left\n\u001b[32m74% context left\u001b[0m";

    expect(extractCodexContextLeft(input)).toBe("74% context left");
  });

  it("extracts the latest '% left' label even when it is not at line end", () => {
    const input =
      "❯ prompt 78% left | model info\nstatusline: cpu=9% mem=63% context | tokens 43% left | mode";

    expect(extractCodexContextLeft(input)).toBe("43% left");
  });

  it("prefers the latest match when 'context left' and 'left' are mixed", () => {
    const input = "81% context left\nstatus 49% left";

    expect(extractCodexContextLeft(input)).toBe("49% left");
  });

  it("returns null when no context-left style label exists", () => {
    expect(extractCodexContextLeft("no context label here")).toBeNull();
  });
});
