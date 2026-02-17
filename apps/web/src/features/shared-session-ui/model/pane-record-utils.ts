export const findStalePaneIds = <T>(record: Record<string, T>, activePaneIds: Set<string>) =>
  Object.keys(record).filter((paneId) => !activePaneIds.has(paneId));

export const prunePaneRecord = <T>(record: Record<string, T>, activePaneIds: Set<string>) => {
  const stalePaneIds = findStalePaneIds(record, activePaneIds);
  if (stalePaneIds.length === 0) {
    return record;
  }
  const stalePaneIdSet = new Set(stalePaneIds);
  const nextRecord: Record<string, T> = {};
  Object.entries(record).forEach(([paneId, value]) => {
    if (!stalePaneIdSet.has(paneId)) {
      nextRecord[paneId] = value;
    }
  });
  return nextRecord;
};
