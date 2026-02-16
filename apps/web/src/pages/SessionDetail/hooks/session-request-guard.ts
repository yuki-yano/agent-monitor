import type { MutableRefObject } from "react";

export const createNextRequestId = (requestIdRef: MutableRefObject<number>) => {
  const requestId = requestIdRef.current + 1;
  requestIdRef.current = requestId;
  return requestId;
};

export const isCurrentRequest = (requestIdRef: MutableRefObject<number>, requestId: number) =>
  requestIdRef.current === requestId;

export const isCurrentScopedRequest = ({
  requestIdRef,
  requestId,
  activeScopeRef,
  scopeKey,
}: {
  requestIdRef: MutableRefObject<number>;
  requestId: number;
  activeScopeRef: MutableRefObject<string>;
  scopeKey: string;
}) => isCurrentRequest(requestIdRef, requestId) && activeScopeRef.current === scopeKey;

export const isCurrentPaneRequest = ({
  requestIdRef,
  requestId,
  activePaneIdRef,
  paneId,
}: {
  requestIdRef: MutableRefObject<number>;
  requestId: number;
  activePaneIdRef: MutableRefObject<string>;
  paneId: string;
}) => isCurrentRequest(requestIdRef, requestId) && activePaneIdRef.current === paneId;
