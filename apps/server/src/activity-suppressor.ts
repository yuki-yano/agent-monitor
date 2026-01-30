const lastPaneFocusAt = new Map<string, number>();

const SUPPRESS_WINDOW_MS = 2000;
const STALE_WINDOW_MS = 15000;

export const markPaneFocus = (paneId: string) => {
  if (!paneId) {
    return;
  }
  lastPaneFocusAt.set(paneId, Date.now());
};

export const shouldSuppressActivity = (paneId: string, activityIso: string | null) => {
  if (!paneId || !activityIso) {
    return false;
  }
  const lastFocus = lastPaneFocusAt.get(paneId);
  if (!lastFocus) {
    return false;
  }
  const activityTs = Date.parse(activityIso);
  if (Number.isNaN(activityTs)) {
    return false;
  }
  const now = Date.now();
  if (now - lastFocus > STALE_WINDOW_MS) {
    lastPaneFocusAt.delete(paneId);
    return false;
  }
  return activityTs >= lastFocus && activityTs - lastFocus <= SUPPRESS_WINDOW_MS;
};
