import type { SessionDetail } from "@tmux-agent-monitor/shared";
import { ArrowLeft, X } from "lucide-react";
import { Link } from "react-router-dom";

import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";

import {
  agentLabelFor,
  agentToneFor,
  backLinkClass,
  formatPath,
  formatRelativeTime,
  getLastInputTone,
  stateTone,
} from "../sessionDetailUtils";

type SessionHeaderProps = {
  session: SessionDetail;
  readOnly: boolean;
  connectionIssue: string | null;
  nowMs: number;
  titleDraft: string;
  titleEditing: boolean;
  titleSaving: boolean;
  titleError: string | null;
  onTitleDraftChange: (value: string) => void;
  onTitleSave: () => void;
  onTitleClear: () => void;
  onOpenTitleEditor: () => void;
  onCloseTitleEditor: () => void;
};

export const SessionHeader = ({
  session,
  readOnly,
  connectionIssue,
  nowMs,
  titleDraft,
  titleEditing,
  titleSaving,
  titleError,
  onTitleDraftChange,
  onTitleSave,
  onTitleClear,
  onOpenTitleEditor,
  onCloseTitleEditor,
}: SessionHeaderProps) => {
  const sessionCustomTitle = session.customTitle ?? null;
  const sessionAutoTitle = session.title ?? session.sessionName ?? "";
  const sessionDisplayTitle = sessionCustomTitle ?? sessionAutoTitle;
  const lastInputTone = getLastInputTone(session.lastInputAt ?? null, nowMs);
  const agentTone = agentToneFor(session.agent);
  const agentLabel = agentLabelFor(session.agent);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <Link to="/" className={backLinkClass}>
          <ArrowLeft className="h-4 w-4" />
          Back to list
        </Link>
        <ThemeToggle />
      </div>
      <header className="shadow-glass border-latte-surface1/60 bg-latte-base/80 flex flex-col gap-3 rounded-2xl border p-4 backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {titleEditing ? (
                <input
                  type="text"
                  value={titleDraft}
                  onChange={(event) => {
                    onTitleDraftChange(event.target.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void onTitleSave();
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      onCloseTitleEditor();
                    }
                  }}
                  onBlur={() => {
                    if (titleSaving) return;
                    onCloseTitleEditor();
                  }}
                  placeholder={sessionAutoTitle || "Untitled session"}
                  maxLength={80}
                  enterKeyHint="done"
                  disabled={titleSaving}
                  className="border-latte-surface2 text-latte-text focus:border-latte-lavender focus:ring-latte-lavender/30 bg-latte-base/70 min-w-[180px] flex-1 rounded-2xl border px-3 py-1.5 text-xl shadow-sm outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Custom session title"
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  onClick={onOpenTitleEditor}
                  disabled={readOnly}
                  className={`font-display text-latte-text text-left text-xl transition ${
                    readOnly ? "cursor-default" : "hover:text-latte-lavender cursor-text"
                  } disabled:opacity-70`}
                  aria-label="Edit session title"
                >
                  {sessionDisplayTitle}
                </button>
              )}
              {sessionCustomTitle && !readOnly && !titleEditing && (
                <button
                  type="button"
                  onClick={() => void onTitleClear()}
                  disabled={titleSaving}
                  className="border-latte-surface2 text-latte-subtext0 hover:text-latte-red hover:border-latte-red/60 inline-flex h-6 w-6 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Clear custom title"
                  title="Clear custom title"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="space-y-4">
              <p className="text-latte-subtext0 text-sm">{formatPath(session.currentPath)}</p>
              <div className="text-latte-overlay1 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                <span className="border-latte-surface2/60 bg-latte-crust/40 rounded-full border px-3 py-1">
                  Session {session.sessionName}
                </span>
                <span className="border-latte-surface2/60 bg-latte-crust/40 rounded-full border px-3 py-1">
                  Window {session.windowIndex}
                </span>
                <span className="border-latte-surface2/60 bg-latte-crust/40 rounded-full border px-3 py-1">
                  Pane {session.paneId}
                </span>
              </div>
            </div>
            {titleError && <p className="text-latte-red text-xs">{titleError}</p>}
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <Badge tone={stateTone(session.state)}>{session.state}</Badge>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={agentTone}>{agentLabel}</Badge>
              <span
                className={`${lastInputTone.pill} inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${lastInputTone.dot}`} />
                <span className="text-[9px] uppercase tracking-[0.2em]">Last input</span>
                <span>{formatRelativeTime(session.lastInputAt, nowMs)}</span>
              </span>
            </div>
          </div>
        </div>
        {session.pipeConflict && (
          <div className="border-latte-red/40 bg-latte-red/10 text-latte-red rounded-2xl border px-4 py-2 text-sm">
            Another pipe-pane is attached. Screen is capture-only.
          </div>
        )}
        {readOnly && (
          <div className="border-latte-peach/50 bg-latte-peach/10 text-latte-peach rounded-2xl border px-4 py-2 text-sm">
            Read-only mode is active. Actions are disabled.
          </div>
        )}
        {connectionIssue && (
          <div className="border-latte-peach/50 bg-latte-peach/10 text-latte-peach rounded-2xl border px-4 py-2 text-sm">
            {connectionIssue}
          </div>
        )}
      </header>
    </>
  );
};
