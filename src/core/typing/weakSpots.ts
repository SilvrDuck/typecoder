import type { TypingState, TypingMistake } from "./typingEngine";

export type WeakSpotReport = {
  hardestChars: Array<{ char: string; count: number }>;
  hardestLines: Array<{ line: number; count: number; preview: string }>;
};

export type SnippetResult = {
  target: string;
  state: TypingState;
  label: string;
  path?: string;
};

/**
 * Aggregate weak spots across one or many completed snippets.
 *
 * - Counts every mistake by expected character (whitespace is collapsed
 *   into a single "space" / "tab" / "newline" bucket for display).
 * - Counts mistakes per absolute line within each snippet, then ranks.
 */
export function summarizeWeakSpots(
  results: SnippetResult[],
  opts: { topChars?: number; topLines?: number } = {},
): WeakSpotReport {
  const topChars = opts.topChars ?? 6;
  const topLines = opts.topLines ?? 5;

  const charCounts = new Map<string, number>();
  const lineCounts = new Map<string, { line: number; preview: string; count: number; key: string }>();

  for (const r of results) {
    for (const m of r.state.mistakes) {
      const ch = mistakeChar(m);
      charCounts.set(ch, (charCounts.get(ch) ?? 0) + 1);
      const { line, preview } = locate(r.target, m.index);
      const key = `${r.path ?? r.label ?? ""}:${line}`;
      const existing = lineCounts.get(key);
      if (existing) existing.count++;
      else lineCounts.set(key, { line, preview, count: 1, key });
    }
  }

  const hardestChars = [...charCounts.entries()]
    .map(([char, count]) => ({ char, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topChars);

  const hardestLines = [...lineCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, topLines)
    .map(({ line, count, preview, key }) => ({
      line,
      count,
      preview: `${key.split(":")[0]}:${line} ${preview}`.trim(),
    }));

  return { hardestChars, hardestLines };
}

/**
 * Build a temporary mini-session of the user's hardest lines so they can
 * practice them. Each item is the raw line text from the original snippet.
 */
export function buildWeakSpotPracticeQueue(
  results: SnippetResult[],
  opts: { maxItems?: number } = {},
): Array<{ label: string; text: string }> {
  const max = opts.maxItems ?? 5;
  const lineKey = (path: string | undefined, line: number) =>
    `${path ?? "snippet"}:${line}`;
  const counts = new Map<
    string,
    { line: number; text: string; path?: string; count: number }
  >();
  for (const r of results) {
    const lines = r.target.split("\n");
    for (const m of r.state.mistakes) {
      const { line } = locate(r.target, m.index);
      const idx = line - 1;
      const text = lines[idx] ?? "";
      if (!text.trim()) continue;
      const k = lineKey(r.path, line);
      const cur = counts.get(k);
      if (cur) cur.count++;
      else counts.set(k, { line, text, path: r.path, count: 1 });
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, max)
    .map((entry) => ({
      label: `${entry.path ?? "snippet"}:${entry.line}`,
      text: entry.text,
    }));
}

function mistakeChar(m: TypingMistake): string {
  if (m.expected === "") return "extra";
  if (m.expected === " ") return "space";
  if (m.expected === "\t") return "tab";
  if (m.expected === "\n") return "newline";
  return m.expected;
}

function locate(target: string, index: number): { line: number; preview: string } {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < index && i < target.length; i++) {
    if (target[i] === "\n") {
      line++;
      lineStart = i + 1;
    }
  }
  let lineEnd = target.indexOf("\n", lineStart);
  if (lineEnd === -1) lineEnd = target.length;
  return { line, preview: target.slice(lineStart, lineEnd).trim().slice(0, 80) };
}
