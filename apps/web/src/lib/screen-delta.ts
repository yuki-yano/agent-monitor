import type { ScreenDelta } from "@vde-monitor/shared";

export const applyScreenDeltas = (
  lines: string[],
  deltas: ScreenDelta[],
): { ok: boolean; lines: string[] } => {
  const next = [...lines];
  let offset = 0;
  for (const delta of deltas) {
    const start = delta.start + offset;
    if (start < 0 || start > next.length) {
      return { ok: false, lines };
    }
    if (delta.deleteCount < 0 || start + delta.deleteCount > next.length) {
      return { ok: false, lines };
    }
    next.splice(start, delta.deleteCount, ...delta.insertLines);
    offset += delta.insertLines.length - delta.deleteCount;
  }
  return { ok: true, lines: next };
};
