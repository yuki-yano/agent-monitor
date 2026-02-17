export const parseTime = (value: string | null) => {
  if (!value) {
    return null;
  }
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? null : ts;
};

const resolveComparableTime = (value: string | null) =>
  parseTime(value) ?? Number.NEGATIVE_INFINITY;

export const compareTimeDesc = (a: string | null, b: string | null) => {
  const aTs = resolveComparableTime(a);
  const bTs = resolveComparableTime(b);
  if (aTs === bTs) {
    return 0;
  }
  return bTs - aTs;
};

export const pickLatestInputAt = <
  TSession extends {
    lastInputAt: string | null;
  },
>(
  sessions: TSession[],
) => {
  let latestValue: string | null = null;
  let latestTs: number | null = null;
  sessions.forEach((session) => {
    const ts = parseTime(session.lastInputAt);
    if (ts == null) {
      return;
    }
    if (latestTs == null || ts > latestTs) {
      latestTs = ts;
      latestValue = session.lastInputAt ?? null;
    }
  });
  return latestValue;
};
