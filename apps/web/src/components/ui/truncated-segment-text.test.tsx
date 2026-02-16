// @vitest-environment happy-dom
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TruncatedSegmentText } from "./truncated-segment-text";

const rect = (width: number): DOMRect =>
  ({
    width,
    height: 0,
    top: 0,
    left: 0,
    right: width,
    bottom: 0,
    x: 0,
    y: 0,
    toJSON: () => "",
  }) as DOMRect;

const waitForNextTick = async () => {
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
};

describe("TruncatedSegmentText", () => {
  let originalGetBoundingClientRect: typeof HTMLElement.prototype.getBoundingClientRect;
  let originalFonts: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function () {
      const dataWidth = this.getAttribute?.("data-width");
      if (dataWidth) {
        return rect(Number(dataWidth));
      }
      if (this.tagName === "SPAN") {
        const text = this.textContent ?? "";
        return rect(text.length * 6);
      }
      return rect(0);
    };
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      return window.setTimeout(() => callback(0), 0);
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      window.clearTimeout(id);
    });
    originalFonts = Object.getOwnPropertyDescriptor(document, "fonts");
    Object.defineProperty(document, "fonts", {
      value: { ready: Promise.resolve() },
      configurable: true,
    });
  });

  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    if (originalFonts) {
      Object.defineProperty(document, "fonts", originalFonts);
    } else {
      // @ts-expect-error - allow cleanup for test runtime
      delete document.fonts;
    }
    vi.restoreAllMocks();
  });

  it("shows full text when it fits", async () => {
    render(
      <TruncatedSegmentText data-testid="text" data-width="300" text="feature/very/long/branch" />,
    );

    await waitForNextTick();

    const text = screen.getByTestId("text");
    const visibleLabel = text.querySelector("span:not([aria-hidden='true'])");
    expect(visibleLabel?.textContent).toBe("feature/very/long/branch");
  });

  it("keeps at least two segments when truncated", async () => {
    render(
      <TruncatedSegmentText data-testid="text" data-width="110" text="aaaaaa/bbbbbb/cccccc" />,
    );

    await waitForNextTick();

    const text = screen.getByTestId("text");
    const visibleLabel = text.querySelector("span:not([aria-hidden='true'])");
    expect(visibleLabel?.textContent).toBe(".../bbbbbb/cccccc");
  });

  it("truncates long single-segment text from the start", async () => {
    render(
      <TruncatedSegmentText
        data-testid="text"
        data-width="110"
        text="feature-super-long-branch-name"
      />,
    );

    await waitForNextTick();

    const text = screen.getByTestId("text");
    const visibleLabel = text.querySelector("span:not([aria-hidden='true'])");
    expect(visibleLabel?.textContent?.startsWith("…")).toBe(true);
    expect(visibleLabel?.textContent).not.toBe("feature-super-long-branch-name");
  });
});
