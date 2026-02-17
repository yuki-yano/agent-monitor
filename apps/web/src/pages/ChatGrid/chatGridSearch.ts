import { CHAT_GRID_MAX_PANE_COUNT } from "./model/chat-grid-layout";

export const normalizeChatGridPaneParam = (value: unknown): string[] => {
  if (typeof value !== "string") {
    return [];
  }

  const parsed = value
    .split(",")
    .map((paneId) => paneId.trim())
    .filter((paneId) => paneId.length > 0);

  const uniquePaneIds: string[] = [];
  const seen = new Set<string>();
  parsed.forEach((paneId) => {
    if (seen.has(paneId)) {
      return;
    }
    seen.add(paneId);
    uniquePaneIds.push(paneId);
  });

  return uniquePaneIds.slice(0, CHAT_GRID_MAX_PANE_COUNT);
};

export const serializeChatGridPaneParam = (paneIds: string[]): string | undefined => {
  const normalized = normalizeChatGridPaneParam(paneIds.join(","));
  if (normalized.length === 0) {
    return undefined;
  }
  return normalized.join(",");
};
