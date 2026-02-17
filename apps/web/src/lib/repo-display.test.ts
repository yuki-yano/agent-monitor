import { describe, expect, it } from "vitest";

import { formatRepoDisplayName } from "./repo-display";

describe("formatRepoDisplayName", () => {
  it("returns fallback for null or empty values", () => {
    expect(formatRepoDisplayName(null)).toBe("No repo");
    expect(formatRepoDisplayName("")).toBe("No repo");
    expect(formatRepoDisplayName("/")).toBe("No repo");
  });

  it("returns basename by default", () => {
    expect(formatRepoDisplayName("/Users/dev/projects/my-repo")).toBe("my-repo");
    expect(formatRepoDisplayName("/Users/dev/projects/my-repo/")).toBe("my-repo");
  });

  it("respects options", () => {
    expect(
      formatRepoDisplayName("/Users/dev/projects/my-repo/", {
        stripTrailingSlash: false,
        preferBasename: false,
      }),
    ).toBe("/Users/dev/projects/my-repo/");
    expect(formatRepoDisplayName(null, { fallbackLabel: "Unknown" })).toBe("Unknown");
  });
});
