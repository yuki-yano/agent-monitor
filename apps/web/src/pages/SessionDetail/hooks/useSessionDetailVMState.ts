import { useAtomValue } from "jotai";
import { useMemo } from "react";

import { useNowMs } from "@/lib/use-now-ms";
import { useSessions } from "@/state/session-context";
import { useTheme } from "@/state/theme-context";

import { screenTextAtom } from "../atoms/screenAtoms";

export const useSessionDetailVMState = (paneId: string) => {
  const {
    sessions,
    connected,
    connectionStatus,
    connectionIssue,
    highlightCorrections,
    fileNavigatorConfig,
    launchConfig,
    getSessionDetail,
    ...sessionApi
  } = useSessions();
  const { resolvedTheme } = useTheme();
  const screenText = useAtomValue(screenTextAtom);
  const nowMs = useNowMs();
  const session = useMemo(() => getSessionDetail(paneId), [getSessionDetail, paneId]);

  return {
    sessions,
    connected,
    connectionStatus,
    connectionIssue,
    highlightCorrections,
    fileNavigatorConfig,
    launchConfig,
    resolvedTheme,
    session,
    screenText,
    nowMs,
    ...sessionApi,
  };
};
