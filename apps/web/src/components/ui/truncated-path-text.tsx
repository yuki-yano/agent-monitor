import { TruncatedSegmentText, type TruncatedSegmentTextProps } from "./truncated-segment-text";

type TruncatedPathTextProps = Omit<TruncatedSegmentTextProps, "text" | "segmentDelimiter"> & {
  path: string;
};

export const TruncatedPathText = ({
  path,
  reservePx = 8,
  minVisibleSegments = 2,
  ...props
}: TruncatedPathTextProps) => {
  return (
    <TruncatedSegmentText
      {...props}
      text={path}
      segmentDelimiter="/"
      reservePx={reservePx}
      minVisibleSegments={minVisibleSegments}
    />
  );
};
