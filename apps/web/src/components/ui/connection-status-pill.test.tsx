// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ConnectionStatusPill } from "./connection-status-pill";

describe("ConnectionStatusPill", () => {
  it("renders healthy status with default label and classes", () => {
    render(<ConnectionStatusPill status="healthy" data-testid="pill" />);

    expect(screen.queryByText("Connected")).not.toBeNull();
    const pill = screen.getByTestId("pill");
    expect(pill.className).toContain("text-latte-green");
    expect(pill.className).toContain("border-latte-green/40");
    const dot = pill.querySelector("span");
    expect(dot?.className).toContain("bg-latte-green");
  });

  it("renders disconnected status with custom label and keeps custom class", () => {
    render(
      <ConnectionStatusPill
        status="disconnected"
        disconnectedLabel="Offline"
        className="extra-pill"
        data-testid="pill"
      />,
    );

    expect(screen.queryByText("Offline")).not.toBeNull();
    const pill = screen.getByTestId("pill");
    expect(pill.className).toContain("text-latte-red");
    expect(pill.className).toContain("animate-pulse");
    expect(pill.className).toContain("extra-pill");
  });
});
