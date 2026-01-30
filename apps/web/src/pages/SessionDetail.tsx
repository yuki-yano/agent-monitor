import { defaultDangerCommandPatterns, defaultDangerKeys } from "@agent-monitor/shared";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CornerDownLeft } from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useParams } from "react-router-dom";
import { useStickToBottom } from "use-stick-to-bottom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { renderAnsi } from "@/lib/ansi";
import { useSessions } from "@/state/session-context";

const stateTone = (state: string) => {
  switch (state) {
    case "RUNNING":
      return "running";
    case "WAITING_INPUT":
      return "waiting";
    case "WAITING_PERMISSION":
      return "permission";
    default:
      return "unknown";
  }
};

const compilePatterns = () =>
  defaultDangerCommandPatterns.map((pattern) => new RegExp(pattern, "i"));

const formatPath = (value: string | null) => {
  if (!value) return "—";
  const match = value.match(/^\/(Users|home)\/[^/]+(\/.*)?$/);
  if (match) {
    return `~${match[2] ?? ""}`;
  }
  return value;
};

const isDangerousText = (text: string) => {
  const patterns = compilePatterns();
  const normalized = text.replace(/\r\n/g, "\n").split("\n");
  return normalized.some((line) =>
    patterns.some((pattern) => pattern.test(line.toLowerCase().replace(/\s+/g, " ").trim())),
  );
};

const KeyButton = ({
  label,
  onClick,
  danger,
  disabled,
  ariaLabel,
}: {
  label: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}) => (
  <Button
    variant={danger ? "danger" : "ghost"}
    size="sm"
    onClick={onClick}
    className="min-w-[70px]"
    disabled={disabled}
    aria-label={ariaLabel}
  >
    {label}
  </Button>
);

export const SessionDetailPage = () => {
  const { paneId: paneIdEncoded } = useParams();
  const paneId = paneIdEncoded ?? "";
  const { connected, getSessionDetail, requestScreen, sendText, sendKeys, readOnly } =
    useSessions();
  const session = getSessionDetail(paneId);
  const [mode, setMode] = useState<"text" | "image">("text");
  const [screen, setScreen] = useState<string>("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");
  const [autoEnter, setAutoEnter] = useState(true);
  const [shiftHeld, setShiftHeld] = useState(false);
  const [ctrlHeld, setCtrlHeld] = useState(false);
  const refreshInFlightRef = useRef(false);
  const renderedScreen = useMemo(() => renderAnsi(screen || "No screen data"), [screen]);
  const { scrollRef, contentRef, stopScroll } = useStickToBottom({
    initial: "instant",
    resize: "instant",
  });
  const prevModeRef = useRef<"text" | "image">(mode);
  const snapToBottomRef = useRef(false);

  useEffect(() => {
    const prevMode = prevModeRef.current;
    if (prevMode === "image" && mode === "text") {
      snapToBottomRef.current = true;
    }
    prevModeRef.current = mode;
  }, [mode]);

  useLayoutEffect(() => {
    if (!snapToBottomRef.current || mode !== "text") {
      return;
    }
    const scrollEl = scrollRef.current;
    if (!scrollEl) {
      return;
    }
    stopScroll?.();
    scrollEl.scrollTop = scrollEl.scrollHeight;
    requestAnimationFrame(() => {
      scrollEl.scrollTop = scrollEl.scrollHeight;
    });
    snapToBottomRef.current = false;
  }, [mode, screen, renderedScreen, scrollRef, stopScroll]);

  const refreshScreen = useCallback(async () => {
    if (!paneId) return;
    if (!connected) {
      return;
    }
    if (refreshInFlightRef.current) {
      return;
    }
    setError(null);
    refreshInFlightRef.current = true;
    try {
      const response = await requestScreen(paneId, { mode });
      if (!response.ok) {
        setError(response.error?.message ?? "Failed to capture screen");
        return;
      }
      setFallbackReason(response.fallbackReason ?? null);
      if (response.mode === "image") {
        setImageBase64(response.imageBase64 ?? null);
        setScreen("");
      } else {
        setScreen(response.screen ?? "");
        setImageBase64(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Screen request failed");
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [connected, mode, paneId, requestScreen]);

  useEffect(() => {
    refreshScreen();
  }, [refreshScreen]);

  useEffect(() => {
    if (!paneId || !connected) {
      return;
    }
    const intervalMs = mode === "image" ? 2000 : 1000;
    const intervalId = window.setInterval(() => {
      if (document.hidden) return;
      refreshScreen();
    }, intervalMs);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [connected, mode, paneId, refreshScreen]);

  const mapKeyWithModifiers = useCallback(
    (key: string) => {
      if (shiftHeld && key === "Tab") {
        return "BTab";
      }
      if (ctrlHeld) {
        const ctrlMap: Record<string, string> = {
          Left: "C-Left",
          Right: "C-Right",
          Up: "C-Up",
          Down: "C-Down",
          Tab: "C-Tab",
          Enter: "C-Enter",
          Escape: "C-Escape",
          BTab: "C-BTab",
        };
        if (ctrlMap[key]) {
          return ctrlMap[key];
        }
      }
      return key;
    },
    [ctrlHeld, shiftHeld],
  );

  const handleSendKey = async (key: string) => {
    if (readOnly) return;
    const mapped = mapKeyWithModifiers(key);
    const hasDanger = defaultDangerKeys.includes(mapped);
    if (hasDanger) {
      const confirmed = window.confirm("Dangerous key detected. Send anyway?");
      if (!confirmed) return;
    }
    const result = await sendKeys(paneId, [mapped]);
    if (!result.ok) {
      setError(result.error?.message ?? "Failed to send keys");
    }
  };

  const handleSendText = async () => {
    if (readOnly) return;
    if (!textInput.trim()) return;
    if (isDangerousText(textInput)) {
      const confirmed = window.confirm("Dangerous command detected. Send anyway?");
      if (!confirmed) return;
    }
    const result = await sendText(paneId, textInput, autoEnter);
    if (!result.ok) {
      setError(result.error?.message ?? "Failed to send text");
      return;
    }
    setTextInput("");
  };

  const tabLabel = shiftHeld ? "Shift+Tab" : "Tab";
  const agentLabel =
    session?.agent === "codex"
      ? "CODEX"
      : session?.agent === "claude"
        ? "CLAUDE"
        : (session?.agent?.toUpperCase?.() ?? "UNKNOWN");

  if (!session) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-10">
        <Card>
          <p className="text-latte-subtext0 text-sm">Session not found.</p>
          <Link to="/" className="text-latte-blue mt-4 inline-flex text-sm">
            Back to list
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
      <header className="shadow-glass flex flex-col gap-4 rounded-[32px] border border-white/60 bg-white/80 p-6 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link to="/" className="text-latte-subtext0 text-xs uppercase tracking-[0.4em]">
              ← Back to list
            </Link>
            <h1 className="font-display text-latte-text text-3xl">
              {session.title ?? session.sessionName}
            </h1>
            <p className="text-latte-subtext0 text-sm">{formatPath(session.currentPath)}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-latte-subtext1 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em]">
              Agent
              <span className="border-latte-lavender/35 bg-latte-lavender/10 text-latte-lavender inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.2em]">
                {agentLabel}
              </span>
            </div>
            <Badge tone={stateTone(session.state)}>{session.state}</Badge>
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
      </header>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Tabs
                value={mode}
                onValueChange={(value) => {
                  if (value === "text" || value === "image") {
                    setMode(value);
                  }
                }}
              >
                <TabsList aria-label="Screen mode">
                  <TabsTrigger value="text">Text</TabsTrigger>
                  <TabsTrigger value="image">Image</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <Button variant="ghost" size="sm" onClick={refreshScreen}>
              Refresh
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
          <div className="border-latte-surface1 bg-latte-mantle/40 flex min-h-[320px] w-full min-w-0 max-w-full flex-1 overflow-hidden rounded-2xl border p-4">
            {mode === "image" && imageBase64 ? (
              <div className="flex w-full items-center justify-center">
                <img
                  src={`data:image/png;base64,${imageBase64}`}
                  alt="screen"
                  className="border-latte-surface2 max-h-[480px] w-full rounded-xl border object-contain"
                />
              </div>
            ) : (
              <div
                ref={scrollRef}
                className="w-full min-w-0 max-w-full overflow-x-auto overflow-y-auto"
                style={{ maxHeight: "60vh" }}
              >
                <div ref={contentRef}>
                  <pre
                    className="text-latte-text w-max whitespace-pre font-mono text-xs"
                    dangerouslySetInnerHTML={{ __html: renderedScreen }}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          {!readOnly ? (
            <Card className="space-y-3">
              <div className="flex items-start gap-3">
                <textarea
                  value={textInput}
                  placeholder="Type a command…"
                  onChange={(event) => setTextInput(event.target.value)}
                  rows={2}
                  className="border-latte-surface2 text-latte-text focus:border-latte-lavender focus:ring-latte-lavender/30 min-h-[64px] min-w-0 flex-1 resize-y rounded-2xl border bg-white/70 px-4 py-2 text-sm shadow-sm outline-none transition focus:ring-2"
                />
                <div className="flex shrink-0 flex-col items-end gap-2 self-start">
                  <Button onClick={handleSendText}>Send</Button>
                  <button
                    type="button"
                    onClick={() => setAutoEnter((prev) => !prev)}
                    aria-pressed={autoEnter}
                    title="Auto-enter after send"
                    className={`group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] transition ${
                      autoEnter
                        ? "border-latte-lavender/60 bg-latte-lavender/10 text-latte-lavender shadow-[inset_0_0_0_1px_rgba(114,135,253,0.12)]"
                        : "border-latte-surface2/70 text-latte-subtext0 hover:border-latte-overlay1 hover:text-latte-text"
                    }`}
                  >
                    <span className="text-[9px] font-semibold tracking-[0.3em]">Auto</span>
                    <CornerDownLeft className="h-3.5 w-3.5" />
                    <span className="sr-only">Auto-enter</span>
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant={shiftHeld ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => setShiftHeld((prev) => !prev)}
                    aria-pressed={shiftHeld}
                    className="font-mono text-[11px] uppercase tracking-[0.3em]"
                  >
                    Shift
                  </Button>
                  <Button
                    variant={ctrlHeld ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => setCtrlHeld((prev) => !prev)}
                    aria-pressed={ctrlHeld}
                    className="font-mono text-[11px] uppercase tracking-[0.3em]"
                  >
                    Ctrl
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Esc", key: "Escape" },
                  { label: tabLabel, key: "Tab" },
                  { label: "Enter", key: "Enter" },
                ].map((item) => (
                  <KeyButton
                    key={item.key}
                    label={item.label}
                    onClick={() => handleSendKey(item.key)}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                {[
                  {
                    label: (
                      <>
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Left</span>
                      </>
                    ),
                    key: "Left",
                    ariaLabel: "Left",
                  },
                  {
                    label: (
                      <>
                        <ArrowUp className="h-4 w-4" />
                        <span className="sr-only">Up</span>
                      </>
                    ),
                    key: "Up",
                    ariaLabel: "Up",
                  },
                  {
                    label: (
                      <>
                        <ArrowDown className="h-4 w-4" />
                        <span className="sr-only">Down</span>
                      </>
                    ),
                    key: "Down",
                    ariaLabel: "Down",
                  },
                  {
                    label: (
                      <>
                        <ArrowRight className="h-4 w-4" />
                        <span className="sr-only">Right</span>
                      </>
                    ),
                    key: "Right",
                    ariaLabel: "Right",
                  },
                ].map((item) => (
                  <KeyButton
                    key={item.key}
                    label={item.label}
                    ariaLabel={item.ariaLabel}
                    onClick={() => handleSendKey(item.key)}
                  />
                ))}
              </div>
            </Card>
          ) : (
            <Card className="border-latte-peach/50 bg-latte-peach/10 text-latte-peach border text-sm">
              Read-only mode is active. Interactive controls are hidden.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
