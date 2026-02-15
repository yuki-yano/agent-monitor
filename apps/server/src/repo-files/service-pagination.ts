import { createServiceError } from "./service-context";

const DEFAULT_CURSOR_OFFSET = 0;

const encodeCursor = (offset: number) => {
  return Buffer.from(String(offset), "utf8").toString("base64url");
};

const decodeCursor = (cursor: string | undefined) => {
  if (!cursor) {
    return DEFAULT_CURSOR_OFFSET;
  }
  let decoded = "";
  try {
    decoded = Buffer.from(cursor, "base64url").toString("utf8");
  } catch {
    throw createServiceError("INVALID_PAYLOAD", 400, "invalid cursor");
  }
  const parsed = Number.parseInt(decoded, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw createServiceError("INVALID_PAYLOAD", 400, "invalid cursor");
  }
  return parsed;
};

export const paginateItems = <T>({
  allItems,
  cursor,
  limit,
}: {
  allItems: T[];
  cursor: string | undefined;
  limit: number;
}) => {
  const offset = decodeCursor(cursor);
  const pagedItems = allItems.slice(offset, offset + limit);
  const nextOffset = offset + pagedItems.length;
  const nextCursor = nextOffset < allItems.length ? encodeCursor(nextOffset) : undefined;
  return {
    items: pagedItems,
    nextCursor,
    totalCount: allItems.length,
  };
};
