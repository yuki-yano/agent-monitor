import type { HTMLAttributes } from "react";
import { useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

type FilePathLabelSize = "sm" | "xs";

type FilePathLabelProps = HTMLAttributes<HTMLDivElement> & {
  path: string;
  renamedFrom?: string | null;
  size?: FilePathLabelSize;
  tailSegments?: number;
};

const sizeClass = {
  sm: {
    base: "text-sm",
    hint: "text-[11px]",
  },
  xs: {
    base: "text-xs",
    hint: "text-[10px]",
  },
};

const normalizePath = (value: string) => value.replace(/\\/g, "/");

const buildFullDir = (value: string) => {
  const normalized = normalizePath(value);
  const segments = normalized.split("/").filter(Boolean);
  segments.pop();
  return segments.join("/");
};

const buildPathInfo = (value: string, tailSegments: number) => {
  const normalized = normalizePath(value);
  const segments = normalized.split("/").filter(Boolean);
  const base = segments.pop() ?? normalized;
  if (segments.length === 0) {
    return { base, hint: "" };
  }
  const tail = segments.slice(-tailSegments).join("/");
  const prefix = segments.length > tailSegments ? ".../" : "";
  return { base, hint: `${prefix}${tail}` };
};

const useOverflowTruncate = (text: string) => {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [truncate, setTruncate] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!text) {
      setTruncate(false);
      return;
    }
    const measure = () => {
      const isOverflow = el.scrollWidth > el.clientWidth;
      setTruncate(isOverflow);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  return { ref, truncate };
};

const FilePathLabel = ({
  path,
  renamedFrom,
  size = "sm",
  tailSegments = 3,
  className,
  ...props
}: FilePathLabelProps) => {
  const baseInfo = buildPathInfo(path, tailSegments);
  const fullDir = buildFullDir(path);
  const { ref: dirMeasureRef, truncate: truncateDir } = useOverflowTruncate(fullDir);
  const dirLabel = truncateDir ? baseInfo.hint : fullDir;

  const fromInfo = renamedFrom ? buildPathInfo(renamedFrom, tailSegments) : null;
  const fullLabel = renamedFrom ? `${renamedFrom} → ${path}` : path;
  const fromFullLabel = renamedFrom ? normalizePath(renamedFrom) : "";
  const fromShortLabel = fromInfo
    ? `${fromInfo.hint ? `${fromInfo.hint}/` : ""}${fromInfo.base}`
    : (renamedFrom ?? "");
  const fromMeasureText = renamedFrom ? `from ${fromFullLabel}` : "";
  const { ref: fromMeasureRef, truncate: truncateFrom } = useOverflowTruncate(fromMeasureText);
  const fromLabel = truncateFrom ? fromShortLabel : fromFullLabel;

  const hintClass = cn("text-latte-subtext0 block truncate", sizeClass[size].hint);

  return (
    <div className={cn("min-w-0", className)} {...props}>
      <span
        className={cn(
          "text-latte-text block truncate font-semibold leading-snug",
          sizeClass[size].base,
        )}
      >
        {baseInfo.base}
      </span>
      {renamedFrom ? (
        <div className="relative min-w-0">
          <span
            ref={fromMeasureRef}
            aria-hidden
            className={cn(hintClass, "pointer-events-none invisible absolute inset-0")}
          >
            {fromMeasureText}
          </span>
          <span className={hintClass}>from {fromLabel}</span>
        </div>
      ) : (
        dirLabel && (
          <div className="relative min-w-0">
            <span
              ref={dirMeasureRef}
              aria-hidden
              className={cn(hintClass, "pointer-events-none invisible absolute inset-0")}
            >
              {fullDir}
            </span>
            <span className={hintClass}>{dirLabel}</span>
          </div>
        )
      )}
      <span className="sr-only">{fullLabel}</span>
    </div>
  );
};

export { FilePathLabel };
