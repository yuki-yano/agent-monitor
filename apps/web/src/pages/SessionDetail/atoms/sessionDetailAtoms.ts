import {
  type SessionApi,
  sessionApiAtom as sharedSessionApiAtom,
  sessionConnectedAtom as sharedConnectedAtom,
  sessionConnectionIssueAtom as sharedConnectionIssueAtom,
  sessionConnectionStatusAtom as sharedConnectionStatusAtom,
  sessionFileNavigatorConfigAtom as sharedFileNavigatorConfigAtom,
  sessionHighlightCorrectionsAtom as sharedHighlightCorrectionsAtom,
  sessionLaunchConfigAtom as sharedLaunchConfigAtom,
} from "@/state/session-state-atoms";
import { sessionsAtom as sharedSessionsAtom } from "@/state/use-session-store";

export type { SessionApi };

export const sessionsAtom = sharedSessionsAtom;
export const connectedAtom = sharedConnectedAtom;
export const connectionStatusAtom = sharedConnectionStatusAtom;
export const connectionIssueAtom = sharedConnectionIssueAtom;
export const highlightCorrectionsAtom = sharedHighlightCorrectionsAtom;
export const fileNavigatorConfigAtom = sharedFileNavigatorConfigAtom;
export const launchConfigAtom = sharedLaunchConfigAtom;
export const sessionApiAtom = sharedSessionApiAtom;
