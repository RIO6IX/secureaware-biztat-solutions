// Line-based diff between two policy versions, using the longest common subsequence.
// The result is plain data ({ type, text }) and the browser renders it with text nodes,
// so nothing in a policy can be interpreted as HTML.

const MAX_LINES = 4000;

export function lineDiff(fromText, toText) {
  const a = String(fromText ?? "").replace(/\r\n?/g, "\n").split("\n").slice(0, MAX_LINES);
  const b = String(toText ?? "").replace(/\r\n?/g, "\n").split("\n").slice(0, MAX_LINES);
  const rows = a.length + 1;
  const cols = b.length + 1;
  // lengths[i * cols + j] = LCS length of a[i..] and b[j..]
  const lengths = new Uint32Array(rows * cols);
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      lengths[i * cols + j] = a[i] === b[j]
        ? lengths[(i + 1) * cols + j + 1] + 1
        : Math.max(lengths[(i + 1) * cols + j], lengths[i * cols + j + 1]);
    }
  }
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      ops.push({ type: "same", text: a[i] });
      i += 1;
      j += 1;
    } else if (lengths[(i + 1) * cols + j] >= lengths[i * cols + j + 1]) {
      ops.push({ type: "removed", text: a[i] });
      i += 1;
    } else {
      ops.push({ type: "added", text: b[j] });
      j += 1;
    }
  }
  while (i < a.length) ops.push({ type: "removed", text: a[i++] });
  while (j < b.length) ops.push({ type: "added", text: b[j++] });
  return {
    ops,
    stats: {
      added: ops.filter((op) => op.type === "added").length,
      removed: ops.filter((op) => op.type === "removed").length,
      unchanged: ops.filter((op) => op.type === "same").length
    }
  };
}
