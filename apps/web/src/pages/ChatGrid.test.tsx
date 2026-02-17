// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ChatGridPage } from "./ChatGrid";

const viewModel = { meta: { connected: true } };
const viewSpy = vi.fn();

vi.mock("./ChatGrid/useChatGridVM", () => ({
  useChatGridVM: () => viewModel,
}));

vi.mock("./ChatGrid/ChatGridView", () => ({
  ChatGridView: (props: typeof viewModel) => {
    viewSpy(props);
    return <div data-testid="chat-grid-view">chat-grid</div>;
  },
}));

describe("ChatGridPage", () => {
  it("renders ChatGridView and updates page title", () => {
    render(<ChatGridPage />);

    expect(screen.getByTestId("chat-grid-view")).toBeTruthy();
    expect(viewSpy).toHaveBeenCalledWith(viewModel);
    expect(document.title).toBe("Chat Grid - VDE Monitor");
  });
});
