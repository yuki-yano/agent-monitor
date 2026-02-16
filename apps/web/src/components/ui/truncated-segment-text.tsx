import type { HTMLAttributes } from "react";
import { useMemo, useRef } from "react";

import { useSegmentTruncate } from "@/components/ui/file-path-label-utils";
import { cn } from "@/lib/cn";

type TruncatedSegmentTextProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  text: string;
  segmentDelimiter?: string;
  reservePx?: number;
  minVisibleSegments?: number;
};

const splitSegments = (value: string, delimiter: string) =>
  value.split(delimiter).filter((segment) => segment.length > 0);

export const TruncatedSegmentText = ({
  text,
  segmentDelimiter = "/",
  reservePx = 8,
  minVisibleSegments = 2,
  className,
  title,
  ...props
}: TruncatedSegmentTextProps) => {
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const segments = useMemo(() => splitSegments(text, segmentDelimiter), [segmentDelimiter, text]);
  const { label, measureRef } = useSegmentTruncate({
    text,
    segments,
    reservePx,
    minVisibleSegments,
    containerRef,
  });
  return (
    <span
      ref={containerRef}
      className={cn(
        "relative block min-w-0 max-w-full overflow-hidden whitespace-nowrap",
        className,
      )}
      title={title ?? text}
      {...props}
    >
      <span
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute left-0 top-0 w-max whitespace-nowrap"
      >
        {text}
      </span>
      <span className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{label}</span>
    </span>
  );
};

export type { TruncatedSegmentTextProps };
