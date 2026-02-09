export type PromptBlockRange = {
  start: number;
  endExclusive: number;
};

const hasLineContent = (line: string) => line.trim().length > 0;

const lineStartsWithWhitespace = (line: string) => {
  const firstChar = line[0];
  if (firstChar == null) {
    return false;
  }
  return firstChar.trim().length === 0;
};

export const findPromptBlockEnd = ({
  lines,
  start,
  isPromptStart,
}: {
  lines: readonly string[];
  start: number;
  isPromptStart: (line: string) => boolean;
}) => {
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (isPromptStart(line)) {
      return index;
    }
    if (hasLineContent(line) && !lineStartsWithWhitespace(line)) {
      return index;
    }
  }
  return lines.length;
};

export const collectPromptBlockRanges = ({
  lines,
  isPromptStart,
}: {
  lines: readonly string[];
  isPromptStart: (line: string) => boolean;
}): PromptBlockRange[] => {
  const ranges: PromptBlockRange[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (!isPromptStart(line)) {
      continue;
    }

    const endExclusive = findPromptBlockEnd({
      lines,
      start: index,
      isPromptStart,
    });
    ranges.push({ start: index, endExclusive });
    index = endExclusive - 1;
  }
  return ranges;
};
