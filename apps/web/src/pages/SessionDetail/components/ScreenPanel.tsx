import { ArrowDown, FileText, Image, RefreshCw } from "lucide-react";
import { forwardRef, type HTMLAttributes, type ReactNode, type RefObject } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ScreenMode } from "@/lib/screen-loading";

type ScreenPanelProps = {
  mode: ScreenMode;
  onModeChange: (mode: ScreenMode) => void;
  connected: boolean;
  onRefresh: () => void;
  fallbackReason: string | null;
  error: string | null;
  isScreenLoading: boolean;
  imageBase64: string | null;
  screenLines: string[];
  virtuosoRef: RefObject<VirtuosoHandle | null>;
  isAtBottom: boolean;
  onAtBottomChange: (value: boolean) => void;
  onScrollToBottom: (behavior: "auto" | "smooth") => void;
  controls: ReactNode;
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

const VirtuosoList = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      {...props}
      className={`text-latte-text w-max min-w-max px-2 py-2 font-mono text-xs ${className ?? ""}`}
    />
  ),
);

VirtuosoList.displayName = "VirtuosoList";

export const ScreenPanel = ({
  mode,
  onModeChange,
  connected,
  onRefresh,
  fallbackReason,
  error,
  isScreenLoading,
  imageBase64,
  screenLines,
  virtuosoRef,
  isAtBottom,
  onAtBottomChange,
  onScrollToBottom,
  controls,
}: ScreenPanelProps) => {
  return (
    <Card className="flex min-w-0 flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Tabs
            value={mode}
            onValueChange={(value) => {
              if ((value === "text" || value === "image") && value !== mode) {
                onModeChange(value);
              }
            }}
          >
            <TabsList aria-label="Screen mode">
              <TabsTrigger value="text">
                <span className="inline-flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Text</span>
                </span>
              </TabsTrigger>
              <TabsTrigger value="image">
                <span className="inline-flex items-center gap-1.5">
                  <Image className="h-3.5 w-3.5" />
                  <span>Image</span>
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          aria-label={connected ? "Refresh screen" : "Reconnect"}
        >
          <RefreshCw className="h-4 w-4" />
          <span className="sr-only">{connected ? "Refresh" : "Reconnect"}</span>
        </Button>
      </div>
      {fallbackReason && (
        <div className="border-latte-peach/40 bg-latte-peach/10 text-latte-peach rounded-2xl border px-4 py-2 text-xs">
          Image fallback: {fallbackReason}
        </div>
      )}
      {error && (
        <div className="border-latte-red/40 bg-latte-red/10 text-latte-red rounded-2xl border px-4 py-2 text-xs">
          {error}
        </div>
      )}
      <div className="border-latte-surface2/80 bg-latte-crust/95 relative min-h-[320px] w-full min-w-0 max-w-full flex-1 rounded-2xl border-2 shadow-inner">
        {isScreenLoading && (
          <div className="bg-latte-base/70 absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl backdrop-blur-sm">
            <div className="relative">
              <div className="border-latte-lavender/20 h-10 w-10 rounded-full border-2" />
              <div className="border-latte-lavender absolute inset-0 h-10 w-10 animate-spin rounded-full border-2 border-t-transparent" />
            </div>
            <span className="text-latte-subtext0 text-xs font-medium">Loading screen...</span>
          </div>
        )}
        {mode === "image" && imageBase64 ? (
          <div className="flex w-full items-center justify-center p-3">
            <img
              src={`data:image/png;base64,${imageBase64}`}
              alt="screen"
              className="border-latte-surface2 max-h-[480px] w-full rounded-xl border object-contain"
            />
          </div>
        ) : (
          <>
            <Virtuoso
              ref={virtuosoRef}
              data={screenLines}
              initialTopMostItemIndex={Math.max(screenLines.length - 1, 0)}
              followOutput="auto"
              atBottomStateChange={onAtBottomChange}
              components={{ Scroller: VirtuosoScroller, List: VirtuosoList }}
              className="w-full min-w-0 max-w-full"
              style={{ height: "60vh" }}
              itemContent={(_index, line) => (
                <div
                  className="min-h-4 whitespace-pre leading-4"
                  dangerouslySetInnerHTML={{ __html: line || "&#x200B;" }}
                />
              )}
            />
            {!isAtBottom && (
              <button
                type="button"
                onClick={() => onScrollToBottom("smooth")}
                aria-label="Scroll to bottom"
                className="border-latte-surface2 bg-latte-base/80 text-latte-text hover:border-latte-lavender/60 hover:text-latte-lavender focus-visible:ring-latte-lavender absolute bottom-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full border shadow-md backdrop-blur transition focus-visible:outline-none focus-visible:ring-2"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>
      <div>{controls}</div>
    </Card>
  );
};
