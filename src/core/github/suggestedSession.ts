/**
 * Build a "suggested session" from a repo tree. Used by Load any repo to
 * give the user something to type immediately, before they choose to
 * customize.
 */

import { classifyPath, languageOf, isPreferredExt } from "./fileFilters";
import type { TreeEntry } from "./githubClient";

export type SessionLength = "short" | "medium" | "long";
export type SnippetType = "functions" | "classes" | "files" | "mixed";
export type Difficulty = "readable" | "realistic" | "brutal";

export type SuggestedSession = {
  files: TreeEntry[];
  language?: string;
  estimatedSnippets: number;
};

export type SuggestOptions = {
  length?: SessionLength;
  snippetType?: SnippetType;
  difficulty?: Difficulty;
  language?: string;
  pathFilter?: string;
};

const LENGTH_COUNTS: Record<SessionLength, number> = {
  short: 6,
  medium: 12,
  long: 20,
};

const DIFFICULTY_MAX_BYTES: Record<Difficulty, number> = {
  readable: 8 * 1024,
  realistic: 40 * 1024,
  brutal: 250 * 1024,
};

const PRIORITY_NAMES = [
  // bias toward entry points / core files that read well
  /\bindex\b/i,
  /\bmain\b/i,
  /\bapp\b/i,
  /\bcli\b/i,
  /\bserver\b/i,
  /\bcore\b/i,
  /\brouter?\b/i,
  /\bconfig\b/i,
];

const DEPRIORITIZED = [
  /test[s]?\//i,
  /__tests?__/i,
  /\.test\./i,
  /\.spec\./i,
  /\bexamples?\b/i,
  /\bfixtures?\b/i,
  /\bbench(?:marks?)?\b/i,
  /\bdocs?\b/i,
];

export function buildSuggestedSession(
  entries: TreeEntry[],
  opts: SuggestOptions = {},
): SuggestedSession {
  const length = opts.length ?? "medium";
  const difficulty = opts.difficulty ?? "realistic";
  const limit = DIFFICULTY_MAX_BYTES[difficulty];

  let blobs = entries.filter((e) => e.type === "blob");
  blobs = blobs.filter(
    (e) => classifyPath(e.path, e.size, { maxBytes: limit }) === "ok",
  );
  if (opts.language) {
    const lang = opts.language;
    blobs = blobs.filter((e) => languageOf(e.path) === lang);
  } else {
    // Detect dominant language from the repo's preferred-ext blobs.
    const dominant = detectDominantLanguage(blobs);
    if (dominant) blobs = blobs.filter((e) => languageOf(e.path) === dominant);
  }
  if (opts.pathFilter) {
    const needle = opts.pathFilter.toLowerCase();
    blobs = blobs.filter((e) => e.path.toLowerCase().includes(needle));
  }

  blobs.sort((a, b) => score(b) - score(a));

  const wantCount = LENGTH_COUNTS[length];
  const picked = blobs.slice(0, wantCount);
  return {
    files: picked,
    language: opts.language ?? (picked[0] ? languageOf(picked[0].path) : undefined),
    estimatedSnippets: picked.length,
  };
}

function score(e: TreeEntry): number {
  let s = 0;
  for (const re of PRIORITY_NAMES) if (re.test(e.path)) s += 10;
  for (const re of DEPRIORITIZED) if (re.test(e.path)) s -= 8;
  // Prefer mid-sized files — too small means trivial, too big means slog.
  if (e.size !== undefined) {
    if (e.size < 200) s -= 4;
    if (e.size > 0 && e.size <= 6_000) s += 3;
    if (e.size > 30_000) s -= 2;
  }
  // Slight bonus for shallower paths
  const depth = e.path.split("/").length;
  s -= Math.max(0, depth - 3);
  return s;
}

export function detectDominantLanguage(entries: TreeEntry[]): string | undefined {
  const counts = new Map<string, number>();
  for (const e of entries) {
    if (e.type !== "blob") continue;
    const base = e.path.split("/").pop() ?? "";
    if (!isPreferredExt(base)) continue;
    const lang = languageOf(e.path);
    if (!lang) continue;
    counts.set(lang, (counts.get(lang) ?? 0) + 1);
  }
  let best: string | undefined;
  let bestCount = 0;
  for (const [lang, count] of counts) {
    if (count > bestCount) {
      best = lang;
      bestCount = count;
    }
  }
  return best;
}
