import { useCallback, useEffect, useRef } from "react";

const HEALTH_INTERVAL_MS = 5000;
const HEALTH_TIMEOUT_MS = 10000;

type UseSessionSocketHealthParams = {
  connected: boolean;
  getWebSocket: () => { close: () => void } | null;
  sendPing: () => void;
};

export const useSessionSocketHealth = ({
  connected,
  getWebSocket,
  sendPing,
}: UseSessionSocketHealthParams) => {
  const lastHealthAtRef = useRef<number | null>(null);

  const markHealthy = useCallback(() => {
    lastHealthAtRef.current = Date.now();
  }, []);

  const ensureFreshConnection = useCallback(() => {
    if (!connected) {
      return;
    }
    const lastHealth = lastHealthAtRef.current;
    if (lastHealth && Date.now() - lastHealth > HEALTH_TIMEOUT_MS) {
      getWebSocket()?.close();
      return;
    }
    sendPing();
  }, [connected, getWebSocket, sendPing]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        ensureFreshConnection();
      }
    };
    const handleFocus = () => {
      ensureFreshConnection();
    };
    const handleOnline = () => {
      ensureFreshConnection();
    };
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted || document.visibilityState === "visible") {
        ensureFreshConnection();
      }
    };

    window.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [ensureFreshConnection]);

  useEffect(() => {
    if (!connected) return;
    const intervalId = window.setInterval(() => {
      if (document.hidden) return;
      const lastHealth = lastHealthAtRef.current;
      if (lastHealth && Date.now() - lastHealth > HEALTH_TIMEOUT_MS) {
        getWebSocket()?.close();
        return;
      }
      sendPing();
    }, HEALTH_INTERVAL_MS);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [connected, getWebSocket, sendPing]);

  return { markHealthy };
};
