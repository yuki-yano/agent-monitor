export type ScreenDelta = {
  start: number;
  deleteCount: number;
  insertLines: string[];
};

type EditOp = {
  type: "equal" | "insert" | "delete";
  line: string;
};

const buildEditScript = (before: string[], after: string[]): EditOp[] => {
  const n = before.length;
  const m = after.length;
  if (n === 0 && m === 0) {
    return [];
  }

  const max = n + m;
  const offset = max;
  const v = new Int32Array(2 * max + 1);
  const trace: Int32Array[] = [];
  const readInt = (arr: Int32Array, index: number) => arr[index] ?? 0;

  for (let d = 0; d <= max; d += 1) {
    let done = false;
    for (let k = -d; k <= d; k += 2) {
      const index = k + offset;
      let x = 0;
      if (k === -d || (k !== d && readInt(v, index - 1) < readInt(v, index + 1))) {
        x = readInt(v, index + 1);
      } else {
        x = readInt(v, index - 1) + 1;
      }
      let y = x - k;
      while (x < n && y < m && before[x] === after[y]) {
        x += 1;
        y += 1;
      }
      v[index] = x;
      if (x >= n && y >= m) {
        done = true;
        break;
      }
    }
    trace.push(new Int32Array(v));
    if (done) {
      break;
    }
  }

  const edits: EditOp[] = [];
  let x = n;
  let y = m;

  for (let d = trace.length - 1; d > 0; d -= 1) {
    const vSnapshot = trace[d];
    if (!vSnapshot) {
      break;
    }
    const k = x - y;
    const index = k + offset;
    let prevK = 0;
    if (k === -d || (k !== d && readInt(vSnapshot, index - 1) < readInt(vSnapshot, index + 1))) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }
    const prevIndex = prevK + offset;
    const prevX = readInt(vSnapshot, prevIndex);
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      edits.push({ type: "equal", line: before[x - 1] ?? "" });
      x -= 1;
      y -= 1;
    }

    if (x === prevX) {
      edits.push({ type: "insert", line: after[prevY] ?? "" });
      y -= 1;
    } else {
      edits.push({ type: "delete", line: before[prevX] ?? "" });
      x -= 1;
    }
  }

  while (x > 0 && y > 0) {
    edits.push({ type: "equal", line: before[x - 1] ?? "" });
    x -= 1;
    y -= 1;
  }
  while (x > 0) {
    edits.push({ type: "delete", line: before[x - 1] ?? "" });
    x -= 1;
  }
  while (y > 0) {
    edits.push({ type: "insert", line: after[y - 1] ?? "" });
    y -= 1;
  }

  edits.reverse();
  return edits;
};

export const buildScreenDeltas = (before: string[], after: string[]): ScreenDelta[] => {
  if (before.length === 0 && after.length === 0) {
    return [];
  }

  const ops = buildEditScript(before, after);
  const deltas: ScreenDelta[] = [];
  let current: ScreenDelta | null = null;
  let index = 0;

  const flush = () => {
    if (!current) return;
    if (current.deleteCount > 0 || current.insertLines.length > 0) {
      deltas.push(current);
    }
    current = null;
  };

  ops.forEach((op) => {
    if (op.type === "equal") {
      flush();
      index += 1;
      return;
    }
    if (!current) {
      current = { start: index, deleteCount: 0, insertLines: [] };
    }
    if (op.type === "delete") {
      current.deleteCount += 1;
      index += 1;
      return;
    }
    current.insertLines.push(op.line);
  });

  flush();
  return deltas;
};

const countChangedLines = (deltas: ScreenDelta[]): number => {
  return deltas.reduce(
    (total, delta) => total + Math.max(delta.deleteCount, delta.insertLines.length),
    0,
  );
};

export const shouldSendFull = (
  beforeLength: number,
  afterLength: number,
  deltas: ScreenDelta[],
): boolean => {
  const totalLines = Math.max(beforeLength, afterLength);
  const changedLines = countChangedLines(deltas);
  if (deltas.length > 10) {
    return true;
  }
  if (changedLines > 200) {
    return true;
  }
  if (totalLines === 0) {
    return false;
  }
  return changedLines > totalLines * 0.5;
};
