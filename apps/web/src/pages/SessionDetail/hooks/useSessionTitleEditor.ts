import type { SessionDetail } from "@vde-monitor/shared";
import { useCallback, useEffect, useState } from "react";

import { API_ERROR_MESSAGES } from "@/lib/api-messages";

type UseSessionTitleEditorParams = {
  session: SessionDetail | null;
  paneId: string;
  readOnly: boolean;
  updateSessionTitle: (paneId: string, title: string | null) => Promise<void>;
};

export const useSessionTitleEditor = ({
  session,
  paneId,
  readOnly,
  updateSessionTitle,
}: UseSessionTitleEditorParams) => {
  const sessionCustomTitle = session?.customTitle ?? null;
  const [titleDraft, setTitleDraft] = useState("");
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleSaving, setTitleSaving] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);

  useEffect(() => {
    setTitleEditing(false);
    setTitleSaving(false);
    setTitleError(null);
    setTitleDraft(sessionCustomTitle ?? "");
  }, [paneId, sessionCustomTitle]);

  useEffect(() => {
    if (titleEditing) return;
    setTitleDraft(sessionCustomTitle ?? "");
  }, [sessionCustomTitle, titleEditing]);

  const openTitleEditor = useCallback(() => {
    if (readOnly || !session) return;
    setTitleError(null);
    setTitleDraft(sessionCustomTitle ?? "");
    setTitleEditing(true);
  }, [readOnly, session, sessionCustomTitle]);

  const closeTitleEditor = useCallback(() => {
    setTitleEditing(false);
    setTitleError(null);
    setTitleDraft(sessionCustomTitle ?? "");
  }, [sessionCustomTitle]);

  const updateTitleDraft = useCallback((value: string) => {
    setTitleDraft(value);
    setTitleError(null);
  }, []);

  const saveTitle = useCallback(async () => {
    if (!session || titleSaving) return;
    const trimmed = titleDraft.trim();
    if (trimmed.length > 80) {
      setTitleError("Title must be 80 characters or less.");
      return;
    }
    setTitleSaving(true);
    try {
      await updateSessionTitle(session.paneId, trimmed.length > 0 ? trimmed : null);
      setTitleEditing(false);
      setTitleError(null);
    } catch (err) {
      setTitleError(err instanceof Error ? err.message : API_ERROR_MESSAGES.updateTitle);
    } finally {
      setTitleSaving(false);
    }
  }, [session, titleDraft, titleSaving, updateSessionTitle]);

  const clearTitle = useCallback(async () => {
    if (!session || titleSaving) return;
    setTitleSaving(true);
    try {
      await updateSessionTitle(session.paneId, null);
      setTitleEditing(false);
      setTitleDraft("");
      setTitleError(null);
    } catch (err) {
      setTitleError(err instanceof Error ? err.message : API_ERROR_MESSAGES.updateTitle);
    } finally {
      setTitleSaving(false);
    }
  }, [session, titleSaving, updateSessionTitle]);

  return {
    titleDraft,
    titleEditing,
    titleSaving,
    titleError,
    openTitleEditor,
    closeTitleEditor,
    updateTitleDraft,
    saveTitle,
    clearTitle,
  };
};
