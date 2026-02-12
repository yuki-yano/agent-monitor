import type { PaneMeta, SessionDetail } from "@vde-monitor/shared";

import type { PaneResolvedContext } from "./pane-context-resolver";
import type { PaneObservation } from "./pane-observation";
import { buildSessionDetail } from "./session-detail";

type BuildPaneDetailArgs = {
  pane: PaneMeta;
  observation: PaneObservation;
  paneContext: PaneResolvedContext;
  customTitle: string | null;
};

export const buildPaneDetail = ({
  pane,
  observation,
  paneContext,
  customTitle,
}: BuildPaneDetailArgs): SessionDetail => {
  const { agent, paneState, outputAt, pipeAttached, pipeConflict, finalState } = observation;

  return buildSessionDetail({
    pane,
    agent,
    state: finalState.state,
    stateReason: finalState.reason,
    lastMessage: paneState.lastMessage,
    lastOutputAt: outputAt,
    lastEventAt: paneState.lastEventAt,
    lastInputAt: paneState.lastInputAt,
    pipeAttached,
    pipeConflict,
    customTitle,
    ...paneContext,
  });
};
