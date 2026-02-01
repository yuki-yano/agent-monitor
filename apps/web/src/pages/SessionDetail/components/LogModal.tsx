import type { SessionSummary } from "@tmux-agent-monitor/shared";
import { CornerDownLeft, ExternalLink, X } from "lucide-react";
import { forwardRef, type HTMLAttributes } from "react";
import { Virtuoso } from "react-virtuoso";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type LogModalProps = {
  open: boolean;
  session: SessionSummary | null;
  logLines: string[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onOpenHere: () => void;
  onOpenNewTab: () => void;
};

const VirtuosoScroller = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      {...props}
      className={`custom-scrollbar w-full min-w-0 max-w-full overflow-x-auto overflow-y-auto rounded-2xl ${className ?? ""}`}
    />
  ),
);

VirtuosoScroller.displayName = "VirtuosoScroller";

const QuickLogList = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      {...props}
      className={`text-latte-text w-max min-w-max px-3 py-2 font-mono text-[12px] leading-[16px] ${className ?? ""}`}
    />
  ),
);

QuickLogList.displayName = "QuickLogList";

export const LogModal = ({
  open,
  session,
  logLines,
  loading,
  error,
  onClose,
  onOpenHere,
  onOpenNewTab,
}: LogModalProps) => {
  if (!open || !session) return null;

  return (
    <div className="fixed bottom-24 left-6 z-50 w-[calc(100vw-3rem)] max-w-[480px] translate-x-1 translate-y-1">
      <Card className="border-latte-lavender/40 bg-latte-base/95 font-body animate-fade-in-up relative rounded-[24px] border p-4 shadow-[0_30px_80px_-40px_rgba(76,79,105,0.55),0_0_0_1px_rgba(180,190,254,0.35)] backdrop-blur">
        <button
          type="button"
          onClick={onClose}
          className="shadow-glass border-latte-surface1/60 bg-latte-base/80 text-latte-subtext0 hover:text-latte-text hover:border-latte-lavender/60 absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur transition"
          aria-label="Close log"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3 pr-12">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <p className="text-latte-text truncate text-base font-semibold">
              {session.customTitle ?? session.title ?? session.sessionName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onOpenHere} aria-label="Open here">
              <CornerDownLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onOpenNewTab} aria-label="Open in new tab">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {error && (
          <div className="border-latte-red/40 bg-latte-red/10 text-latte-red mt-2 rounded-2xl border px-3 py-2 text-xs">
            {error}
          </div>
        )}
        <div className="border-latte-surface2/80 bg-latte-crust/95 relative mt-3 min-h-[200px] w-full rounded-2xl border-2 shadow-inner">
          {loading && (
            <div className="bg-latte-base/70 absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl backdrop-blur-sm">
              <div className="relative">
                <div className="border-latte-lavender/20 h-8 w-8 rounded-full border-2" />
                <div className="border-latte-lavender absolute inset-0 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
              </div>
              <span className="text-latte-subtext0 text-xs font-medium">Loading log...</span>
            </div>
          )}
          <Virtuoso
            data={logLines}
            initialTopMostItemIndex={Math.max(logLines.length - 1, 0)}
            followOutput="auto"
            components={{ Scroller: VirtuosoScroller, List: QuickLogList }}
            className="w-full min-w-0 max-w-full"
            style={{ height: "66vh", minHeight: "260px", maxHeight: "78vh" }}
            itemContent={(_index, line) => (
              <div
                className="min-h-4 whitespace-pre leading-5"
                dangerouslySetInnerHTML={{ __html: line || "&#x200B;" }}
              />
            )}
          />
        </div>
      </Card>
    </div>
  );
};
