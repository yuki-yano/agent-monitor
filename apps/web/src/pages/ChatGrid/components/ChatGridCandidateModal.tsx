import type { SessionSummary } from "@vde-monitor/shared";
import { GitBranch, MousePointerClick } from "lucide-react";

import {
  Badge,
  Button,
  Callout,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import {
  resolveSessionDisplayTitle,
  resolveSessionStateLabel,
  resolveSessionStateTone,
} from "@/features/shared-session-ui/model/session-display";
import {
  agentLabelFor,
  agentToneFor,
  formatBranchLabel,
  formatRelativeTime,
  isKnownAgent,
} from "@/lib/session-format";

type ChatGridCandidateModalProps = {
  open: boolean;
  candidateItems: SessionSummary[];
  selectedPaneIds: string[];
  nowMs: number;
  onOpenChange: (open: boolean) => void;
  onTogglePane: (paneId: string) => void;
  onApply: () => void;
};

const MIN_SELECTION_COUNT = 2;
const MAX_SELECTION_COUNT = 6;

export const ChatGridCandidateModal = ({
  open,
  candidateItems,
  selectedPaneIds,
  nowMs,
  onOpenChange,
  onTogglePane,
  onApply,
}: ChatGridCandidateModalProps) => {
  const selectedPaneSet = new Set(selectedPaneIds);
  const selectedCount = selectedPaneIds.length;
  const reachedMaxSelection = selectedCount >= MAX_SELECTION_COUNT;
  const hasSelectionError =
    selectedCount < MIN_SELECTION_COUNT || selectedCount > MAX_SELECTION_COUNT;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(760px,calc(100vw-1rem))] sm:w-[min(760px,calc(100vw-1.5rem))]">
        <DialogHeader className="space-y-2">
          <DialogTitle>Candidate Panes</DialogTitle>
          <DialogDescription>Choose 2-6 panes and click Apply.</DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {candidateItems.length === 0 ? (
            <Callout tone="warning" size="sm">
              No candidate panes are available.
            </Callout>
          ) : (
            <div className="border-latte-surface1/70 bg-latte-base/50 max-h-[52vh] space-y-1 overflow-y-auto rounded-2xl border p-2">
              {candidateItems.map((session) => {
                const checked = selectedPaneSet.has(session.paneId);
                const disabled = !checked && reachedMaxSelection;
                return (
                  <label
                    key={session.paneId}
                    className="border-latte-surface1/65 hover:border-latte-lavender/45 hover:bg-latte-surface0/60 flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition"
                  >
                    <Checkbox
                      checked={checked}
                      onChange={() => onTogglePane(session.paneId)}
                      disabled={disabled}
                      aria-label={`Select ${resolveSessionDisplayTitle(session)}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <Badge tone={resolveSessionStateTone(session)} size="sm">
                          {resolveSessionStateLabel(session)}
                        </Badge>
                        {isKnownAgent(session.agent) ? (
                          <Badge tone={agentToneFor(session.agent)} size="sm">
                            {agentLabelFor(session.agent)}
                          </Badge>
                        ) : null}
                        <span className="text-latte-subtext0 ml-auto text-[11px]">
                          {formatRelativeTime(session.lastInputAt, nowMs)}
                        </span>
                      </div>
                      <p className="text-latte-text mt-1 truncate text-sm font-medium">
                        {resolveSessionDisplayTitle(session)}
                      </p>
                      <div className="text-latte-subtext0 mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="inline-flex items-center gap-1">
                          <GitBranch className="h-3 w-3" />
                          {formatBranchLabel(session.branch)}
                        </span>
                        <span>Pane {session.paneId}</span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          {hasSelectionError ? (
            <Callout tone="warning" size="sm">
              Select between {MIN_SELECTION_COUNT} and {MAX_SELECTION_COUNT} panes.
            </Callout>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={onApply} disabled={hasSelectionError}>
              <MousePointerClick className="h-4 w-4" />
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
