import type { SearchIndexItem } from "./search-index-resolver";

export type SearchWordMatch = {
  path: string;
  name: string;
  kind: SearchIndexItem["kind"];
  score: number;
  highlights: number[];
  isIgnored: boolean;
};

const tokenizeQuery = (query: string) => {
  const rawTokens = query
    .split(/\s+/)
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length > 0);
  return Array.from(new Set(rawTokens));
};

const buildWordSearchMatch = (item: SearchIndexItem, tokens: string[]): SearchWordMatch | null => {
  const lowerName = item.name.toLowerCase();
  const lowerPath = item.path.toLowerCase();
  const highlightSet = new Set<number>();
  let score = 0;

  for (const token of tokens) {
    const nameMatchStart = lowerName.indexOf(token);
    const pathMatchStart = lowerPath.indexOf(token);
    if (nameMatchStart < 0 && pathMatchStart < 0) {
      return null;
    }
    if (nameMatchStart >= 0) {
      for (let offset = 0; offset < token.length; offset += 1) {
        highlightSet.add(nameMatchStart + offset);
      }
      const positionScore = Math.max(0, 220 - nameMatchStart);
      score += positionScore + token.length * 12;
      continue;
    }
    const positionScore = Math.max(0, 120 - pathMatchStart);
    score += positionScore + token.length * 8;
  }

  score += Math.max(0, 100 - item.name.length);

  return {
    path: item.path,
    name: item.name,
    kind: item.kind,
    score,
    highlights: Array.from(highlightSet).sort((left, right) => left - right),
    isIgnored: item.isIgnored,
  };
};

export const buildSortedSearchMatches = (index: SearchIndexItem[], query: string) => {
  const queryTokens = tokenizeQuery(query);
  return index
    .map((item) => buildWordSearchMatch(item, queryTokens))
    .filter((item): item is SearchWordMatch => item != null)
    .sort((left, right) => {
      const scoreDiff = right.score - left.score;
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      return left.path.localeCompare(right.path);
    });
};
