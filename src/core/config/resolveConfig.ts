/**
 * Resolve a validated CodeTypeConfig into a ready-to-type session by
 * fetching each item's source text from GitHub (or the in-memory demo
 * repo) and extracting the precise line range when a symbol is named.
 */

import { normalizeCode } from "../typing/normalizeCode";
import {
  extractSymbols,
  extractByLineRange,
  findSymbol,
  type CodeSymbol,
} from "../symbols/regexExtractors";
import { findDemoFile, DEMO_REPO } from "../demo/tinyRepo";
import { languageOf } from "../github/fileFilters";

/**
 * Hard cap on lines per item. Sessions feel like *navigating* a codebase
 * — short tidbits that the user moves between — rather than slogging
 * through 200-line walls of code.
 */
export const MAX_LINES_PER_ITEM = 30;
import type {
  CodeTypeConfig,
  PracticeItem,
} from "./schema";
import type {
  GithubError,
} from "../github/githubClient";

export type ResolvedItem = {
  id: string;
  label: string;
  text: string;
  path: string;
  symbol?: string;
  level: PracticeItem["level"];
  language?: string;
  startLine?: number;
  endLine?: number;
  whyItMatters?: string;
};

export type ResolvedItemError = {
  index: number;
  label: string;
  kind:
    | "fetch_failed"
    | "symbol_missing"
    | "invalid_range"
    | "empty_snippet";
  message: string;
  detail?: GithubError;
};

export type ResolvedSession = {
  title: string;
  description?: string;
  repo: string;
  ref: string;
  items: ResolvedItem[];
  errors: ResolvedItemError[];
};

export type FileFetcher = (
  owner: string,
  repo: string,
  ref: string,
  path: string,
) => Promise<{ ok: true; value: string } | { ok: false; error: GithubError }>;

export async function resolveConfig(
  config: CodeTypeConfig,
  fetcher: FileFetcher,
  opts: { defaultRef?: string } = {},
): Promise<ResolvedSession> {
  const ref = config.ref ?? opts.defaultRef ?? "main";
  const [owner, repo] = config.repo.split("/");
  const items: ResolvedItem[] = [];
  const errors: ResolvedItemError[] = [];

  // For the bundled demo repo, never hit the network — read from memory.
  const isDemo = config.repo === DEMO_REPO;

  for (let i = 0; i < config.items.length; i++) {
    const item = config.items[i];
    const id = `item-${i}`;

    const fileResult = isDemo
      ? demoFetch(item.path)
      : await fetcher(owner, repo, ref, item.path);

    if (!fileResult.ok) {
      errors.push({
        index: i,
        label: item.label,
        kind: "fetch_failed",
        message:
          fileResult.error.kind === "not_found"
            ? `Could not find ${item.path} in this repository.`
            : `Could not load ${item.path}: ${fileResult.error.message}`,
        detail: fileResult.error,
      });
      continue;
    }

    const code = normalizeCode(fileResult.value);
    let text = code;
    let startLine: number | undefined;
    let endLine: number | undefined;
    let symbolName: string | undefined =
      "symbol" in item ? item.symbol : undefined;

    if (item.level === "file") {
      if (item.startLine !== undefined && item.endLine !== undefined) {
        if (item.startLine > item.endLine) {
          errors.push(rangeError(i, item));
          continue;
        }
        text = extractByLineRange(code, item.startLine, item.endLine);
        startLine = item.startLine;
        endLine = item.endLine;
      } else {
        // No explicit range: skip preamble (blank lines, comments,
        // imports) and take MAX_LINES_PER_ITEM lines from there so a
        // file item feels like a tidbit rather than the whole file.
        const totalLines = code.split("\n").length;
        const ws = findWindowStart(code);
        const we = Math.min(totalLines, ws + MAX_LINES_PER_ITEM - 1);
        if (ws > 1 || we < totalLines) {
          text = extractByLineRange(code, ws, we);
          startLine = ws;
          endLine = we;
        }
      }
    } else {
      // function or class — prefer line range if both are supplied, else
      // try the symbol extractor.
      if (item.startLine !== undefined && item.endLine !== undefined) {
        if (item.startLine > item.endLine) {
          errors.push(rangeError(i, item));
          continue;
        }
        text = extractByLineRange(code, item.startLine, item.endLine);
        startLine = item.startLine;
        endLine = item.endLine;
      } else if (symbolName) {
        const symbols = await extractSymbols(item.path, code);
        const sym = findSymbol(symbols, symbolName);
        if (!sym) {
          errors.push({
            index: i,
            label: item.label,
            kind: "symbol_missing",
            message: `Item ${i + 1} asks for ${item.level} ${symbolName}, but no matching symbol was found in ${item.path}.`,
          });
          continue;
        }
        const symEnd = Math.min(
          sym.endLine,
          sym.startLine + MAX_LINES_PER_ITEM - 1,
        );
        text = extractByLineRange(code, sym.startLine, symEnd);
        startLine = sym.startLine;
        endLine = symEnd;
      } else {
        errors.push({
          index: i,
          label: item.label,
          kind: "symbol_missing",
          message: `Item ${i + 1} (${item.level}) needs a symbol or a line range to resolve.`,
        });
        continue;
      }
    }

    // Final clip pass: even when the caller supplied an explicit range
    // or a symbol resolved to a huge body, never let a single item run
    // past MAX_LINES_PER_ITEM lines.
    const lineCount = text.split("\n").length;
    if (lineCount > MAX_LINES_PER_ITEM) {
      text = text.split("\n").slice(0, MAX_LINES_PER_ITEM).join("\n");
      if (startLine !== undefined) {
        endLine = startLine + MAX_LINES_PER_ITEM - 1;
      }
    }

    if (!text.trim()) {
      errors.push({
        index: i,
        label: item.label,
        kind: "empty_snippet",
        message: `Item ${i + 1} resolved to an empty snippet.`,
      });
      continue;
    }

    items.push({
      id,
      label: item.label,
      text: text === code ? text : normalizeCode(text),
      path: item.path,
      symbol: symbolName,
      level: item.level,
      language: languageOf(item.path),
      startLine,
      endLine,
    });
  }

  return {
    title: config.title,
    description: config.description,
    repo: config.repo,
    ref,
    items,
    errors,
  };
}

function demoFetch(
  path: string,
): { ok: true; value: string } | { ok: false; error: GithubError } {
  const f = findDemoFile(path);
  if (!f)
    return {
      ok: false,
      error: {
        kind: "not_found",
        message: `${path} not present in the demo repo.`,
      },
    };
  return { ok: true, value: f.text };
}

function rangeError(i: number, item: PracticeItem): ResolvedItemError {
  return {
    index: i,
    label: item.label,
    kind: "invalid_range",
    message: `Item ${i + 1} has startLine > endLine.`,
  };
}

/**
 * Find a 1-indexed line where a "tidbit" window should start: skip
 * leading blank lines, single-line comments, and import-like preamble
 * so we land on real code. Falls back to line 1 if nothing else looks
 * like the start.
 */
function findWindowStart(code: string, maxSkip = 60): number {
  const lines = code.split("\n");
  const SKIP_RE =
    /^\s*(\/\/|#(?!include|define|pragma)|--|\*|\/\*|<!--)/;
  const PREAMBLE_RE =
    /^\s*(import|from|use(?!r)|using|require|include|package|#include|#define|#pragma|@import|namespace|<\?php|<%|export\s+\*|export\s+\{|export\s+type|export\s+interface)\b/;
  let i = 0;
  const limit = Math.min(lines.length, maxSkip);
  while (i < limit) {
    const line = lines[i];
    if (line.trim() === "" || SKIP_RE.test(line) || PREAMBLE_RE.test(line)) {
      i++;
      continue;
    }
    break;
  }
  if (i >= lines.length) return 1;
  return i + 1;
}

// Re-export for convenience
export type { CodeSymbol };
