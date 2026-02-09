// @vitest-environment happy-dom
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { highlightCodeMock, resetShikiHighlighterMock } = vi.hoisted(() => ({
  highlightCodeMock: vi.fn(),
  resetShikiHighlighterMock: vi.fn(),
}));

vi.mock("@/lib/shiki/highlighter", () => ({
  highlightCode: highlightCodeMock,
  resetShikiHighlighter: resetShikiHighlighterMock,
}));

import { ShikiCodeBlock } from "./ShikiCodeBlock";

describe("ShikiCodeBlock", () => {
  beforeEach(() => {
    highlightCodeMock.mockReset();
    resetShikiHighlighterMock.mockReset();
  });

  it("preserves empty lines when line numbers are enabled", async () => {
    highlightCodeMock.mockResolvedValue({
      html:
        '<pre class="shiki"><code><span class="line"><span style="color:#fff">first</span></span>\n' +
        '<span class="line"></span>\n' +
        '<span class="line"><span style="color:#fff">third</span></span>\n' +
        "</code></pre>",
      language: "txt",
    });

    const { container } = render(
      <ShikiCodeBlock code={"first\n\nthird"} language="txt" theme="latte" showLineNumbers />,
    );

    await waitFor(() => {
      expect(container.querySelectorAll(".line")).toHaveLength(3);
    });
    const lines = container.querySelectorAll(".line");
    expect(lines[1]?.textContent).toBe("\u200B");
  });
});
