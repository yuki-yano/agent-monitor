import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { SessionListHeader } from "./SessionListHeader";

const FILTER_OPTIONS = [
  { value: "ALL", label: "ALL" },
  { value: "SHELL", label: "SHELL" },
];

const HeaderHarness = () => {
  const [query, setQuery] = useState("");
  return (
    <SessionListHeader
      connectionStatus="healthy"
      connectionIssue={null}
      filter="ALL"
      searchQuery={query}
      filterOptions={FILTER_OPTIONS}
      onFilterChange={vi.fn()}
      onSearchQueryChange={setQuery}
      onRefresh={vi.fn()}
      onOpenChatGrid={vi.fn()}
    />
  );
};

describe("SessionListHeader focus regression", () => {
  it("keeps focus on search input after debounced query sync", () => {
    vi.useFakeTimers();
    render(<HeaderHarness />);

    const input = screen.getByRole("textbox", { name: "Search sessions" });
    input.focus();
    expect(document.activeElement).toBe(input);

    fireEvent.change(input, { target: { value: "repo" } });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    const latestInput = screen.getByRole("textbox", { name: "Search sessions" });
    expect((latestInput as HTMLInputElement).value).toBe("repo");
    expect(document.activeElement).toBe(latestInput);
  });
});
