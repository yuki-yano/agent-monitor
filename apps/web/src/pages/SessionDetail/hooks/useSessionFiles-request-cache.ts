import type { MutableRefObject } from "react";

type FetchWithRequestMapInput<T> = {
  requestMapRef: MutableRefObject<Map<string, Promise<T>>>;
  requestKey: string;
  requestFactory: () => Promise<T>;
};

export const fetchWithRequestMap = async <T>({
  requestMapRef,
  requestKey,
  requestFactory,
}: FetchWithRequestMapInput<T>) => {
  const inFlight = requestMapRef.current.get(requestKey);
  if (inFlight) {
    return inFlight;
  }
  const request = requestFactory();
  requestMapRef.current.set(requestKey, request);
  try {
    return await request;
  } finally {
    requestMapRef.current.delete(requestKey);
  }
};

export const buildTreePageRequestKey = (paneId: string, targetPath: string, cursor?: string) =>
  `${paneId}:${targetPath}:${cursor ?? ""}`;

export const buildSearchRequestKey = (paneId: string, query: string, cursor?: string) =>
  `${paneId}:${query}:${cursor ?? ""}`;

export const buildFileContentRequestKey = (paneId: string, path: string, maxBytes: number) =>
  `${paneId}:${path}:${maxBytes}`;
