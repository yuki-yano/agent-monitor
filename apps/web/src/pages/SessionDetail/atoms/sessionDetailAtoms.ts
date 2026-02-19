import {
  sessionApiAtom as sharedSessionApiAtom,
  sessionConnectedAtom as sharedConnectedAtom,
} from "@/state/session-state-atoms";

export const connectedAtom = sharedConnectedAtom;
export const sessionApiAtom = sharedSessionApiAtom;
