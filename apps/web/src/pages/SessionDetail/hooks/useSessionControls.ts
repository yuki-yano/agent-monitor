import { type CommandResponse, defaultDangerKeys } from "@vde-monitor/shared";
import { useCallback, useRef, useState } from "react";

import { API_ERROR_MESSAGES } from "@/lib/api-messages";
import type { ScreenMode } from "@/lib/screen-loading";

import { isDangerousText } from "../sessionDetailUtils";

const CTRL_KEY_MAP: Record<string, string> = {
  Left: "C-Left",
  Right: "C-Right",
  Up: "C-Up",
  Down: "C-Down",
  Tab: "C-Tab",
  Enter: "C-Enter",
  Escape: "C-Escape",
  BTab: "C-BTab",
};

type UseSessionControlsParams = {
  paneId: string;
  readOnly: boolean;
  mode: ScreenMode;
  sendText: (paneId: string, text: string, enter?: boolean) => Promise<CommandResponse>;
  sendKeys: (paneId: string, keys: string[]) => Promise<CommandResponse>;
  setScreenError: (error: string | null) => void;
  scrollToBottom: (behavior?: "auto" | "smooth") => void;
};

export const useSessionControls = ({
  paneId,
  readOnly,
  mode,
  sendText,
  sendKeys,
  setScreenError,
  scrollToBottom,
}: UseSessionControlsParams) => {
  const textInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [autoEnter, setAutoEnter] = useState(true);
  const [shiftHeld, setShiftHeld] = useState(false);
  const [ctrlHeld, setCtrlHeld] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);

  const mapKeyWithModifiers = useCallback(
    (key: string) => {
      if (shiftHeld && key === "Tab") {
        return "BTab";
      }
      if (ctrlHeld && CTRL_KEY_MAP[key]) {
        return CTRL_KEY_MAP[key];
      }
      return key;
    },
    [ctrlHeld, shiftHeld],
  );

  const handleSendKey = useCallback(
    async (key: string) => {
      if (readOnly) return;
      const mapped = mapKeyWithModifiers(key);
      const hasDanger = defaultDangerKeys.includes(mapped);
      if (hasDanger) {
        const confirmed = window.confirm("Dangerous key detected. Send anyway?");
        if (!confirmed) return;
      }
      const result = await sendKeys(paneId, [mapped]);
      if (!result.ok) {
        setScreenError(result.error?.message ?? API_ERROR_MESSAGES.sendKeys);
      }
    },
    [mapKeyWithModifiers, paneId, readOnly, sendKeys, setScreenError],
  );

  const handleSendText = useCallback(async () => {
    if (readOnly) return;
    const currentValue = textInputRef.current?.value ?? "";
    if (!currentValue.trim()) return;
    if (isDangerousText(currentValue)) {
      const confirmed = window.confirm("Dangerous command detected. Send anyway?");
      if (!confirmed) return;
    }
    const result = await sendText(paneId, currentValue, autoEnter);
    if (!result.ok) {
      setScreenError(result.error?.message ?? API_ERROR_MESSAGES.sendText);
      return;
    }
    if (textInputRef.current) {
      textInputRef.current.value = "";
    }
    if (mode === "text") {
      scrollToBottom("auto");
    }
  }, [autoEnter, mode, paneId, readOnly, scrollToBottom, sendText, setScreenError]);

  const toggleAutoEnter = useCallback(() => {
    setAutoEnter((prev) => !prev);
  }, []);

  const toggleControls = useCallback(() => {
    setControlsOpen((prev) => !prev);
  }, []);

  const toggleShift = useCallback(() => {
    setShiftHeld((prev) => !prev);
  }, []);

  const toggleCtrl = useCallback(() => {
    setCtrlHeld((prev) => !prev);
  }, []);

  return {
    textInputRef,
    autoEnter,
    shiftHeld,
    ctrlHeld,
    controlsOpen,
    handleSendKey,
    handleSendText,
    toggleAutoEnter,
    toggleControls,
    toggleShift,
    toggleCtrl,
  };
};
