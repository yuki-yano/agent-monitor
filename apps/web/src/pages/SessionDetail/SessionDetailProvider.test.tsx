import { render, screen } from "@testing-library/react";
import { createStore, Provider as JotaiProvider, useAtomValue } from "jotai";
import { describe, expect, it } from "vitest";

import {
  connectedAtom,
  paneIdAtom,
  resolvedThemeAtom,
  sessionApiAtom,
} from "./atoms/sessionDetailAtoms";
import { SessionDetailProvider } from "./SessionDetailProvider";

const AtomProbe = () => {
  const paneId = useAtomValue(paneIdAtom);
  const connected = useAtomValue(connectedAtom);
  const theme = useAtomValue(resolvedThemeAtom);
  const api = useAtomValue(sessionApiAtom);

  return (
    <div>
      <div data-testid="pane-id">{paneId ?? ""}</div>
      <div data-testid="connected">{connected ? "true" : "false"}</div>
      <div data-testid="theme">{theme}</div>
      <div data-testid="api">{api ? "ready" : "missing"}</div>
    </div>
  );
};

describe("SessionDetailProvider", () => {
  it("renders children", () => {
    render(
      <SessionDetailProvider paneId="pane-1">
        <div data-testid="child">child</div>
      </SessionDetailProvider>,
    );

    expect(screen.getByTestId("child").textContent).toBe("child");
  });

  it("does not mutate existing atoms", () => {
    const store = createStore();
    store.set(paneIdAtom, "existing-pane");
    store.set(connectedAtom, false);
    store.set(resolvedThemeAtom, "latte");

    render(
      <JotaiProvider store={store}>
        <SessionDetailProvider paneId="pane-2">
          <AtomProbe />
        </SessionDetailProvider>
      </JotaiProvider>,
    );

    expect(screen.getByTestId("pane-id").textContent).toBe("existing-pane");
    expect(screen.getByTestId("connected").textContent).toBe("false");
    expect(screen.getByTestId("theme").textContent).toBe("latte");
    expect(screen.getByTestId("api").textContent).toBe("ready");
  });
});
