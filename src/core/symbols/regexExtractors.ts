/**
 * Pragmatic regex-based symbol extraction.
 *
 * Goals:
 *   - Never throw. A bad regex match is still less bad than no symbols.
 *   - Cover the languages our curated repos use first (TS, Python, C),
 *     then a long tail.
 *   - For each language, return start/end line for class/function-like
 *     symbols by detecting the opening signature line and a closing
 *     boundary heuristic (next top-level def at same indent, or end of file).
 *
 * This is not a parser. Generated code, weird formatting, or macro-heavy
 * source may produce false negatives or partial ranges. That's fine — the
 * resolver layer falls back to manual line ranges or skips items.
 */

import { languageOf } from "../github/fileFilters";

export type CodeSymbol = {
  level: "class" | "function";
  symbol: string;
  path: string;
  startLine: number; // 1-indexed
  endLine: number; // 1-indexed inclusive
  language: string;
};

type Pattern = {
  level: "class" | "function";
  regex: RegExp;
  // Capture group containing the symbol name.
  nameGroup: number;
};

const TS_JS_PATTERNS: Pattern[] = [
  {
    level: "function",
    regex:
      /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*[<(]/,
    nameGroup: 1,
  },
  {
    level: "function",
    regex:
      /^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*[:=].*?(?:\([^)]*\)\s*=>|function)/,
    nameGroup: 1,
  },
  { level: "class", regex: /^(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/, nameGroup: 1 },
  { level: "function", regex: /^\s*(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/, nameGroup: 1 }, // method-ish
];

const PY_PATTERNS: Pattern[] = [
  { level: "function", regex: /^def\s+([A-Za-z_][\w]*)\s*\(/, nameGroup: 1 },
  { level: "function", regex: /^async\s+def\s+([A-Za-z_][\w]*)\s*\(/, nameGroup: 1 },
  { level: "class", regex: /^class\s+([A-Za-z_][\w]*)\s*[:(\s]/, nameGroup: 1 },
];

const GO_PATTERNS: Pattern[] = [
  {
    level: "function",
    regex: /^func\s+(?:\([^)]+\)\s+)?([A-Za-z_][\w]*)\s*\(/,
    nameGroup: 1,
  },
  { level: "class", regex: /^type\s+([A-Za-z_][\w]*)\s+struct\b/, nameGroup: 1 },
];

const RUST_PATTERNS: Pattern[] = [
  { level: "function", regex: /^(?:pub\s+)?(?:async\s+)?fn\s+([A-Za-z_][\w]*)\s*[<(]/, nameGroup: 1 },
  { level: "class", regex: /^(?:pub\s+)?struct\s+([A-Za-z_][\w]*)\b/, nameGroup: 1 },
  { level: "class", regex: /^(?:pub\s+)?enum\s+([A-Za-z_][\w]*)\b/, nameGroup: 1 },
  { level: "class", regex: /^impl(?:\s*<[^>]+>)?\s+([A-Za-z_][\w]*)\b/, nameGroup: 1 },
];

// Negative lookahead `(?![A-Z_]+\s*\()` excludes all-caps macro invocations
// like EXPORT_SYMBOL(foo) that would otherwise look like function definitions
// at column 0 in kernel-style C.
const C_LIKE_PATTERNS: Pattern[] = [
  // Single-line C / C++ function definition: `returntype name(args) {`
  {
    level: "function",
    regex:
      /^(?![A-Z_]+\s*\()[A-Za-z_][\w\s*&<>:,]*?\s+\**\s*(?=[A-Za-z_]*[a-z])([A-Za-z_][\w]*)\s*\([^)]*\)\s*(?:const)?\s*\{/,
    nameGroup: 1,
  },
  // Multi-line C function signature start: `static __init void foo(`
  // (next lines hold args; opening brace is on a later line). Excludes
  // calls because calls usually appear indented, and excludes all-caps
  // macros via the lookahead.
  {
    level: "function",
    regex:
      /^(?![A-Z_]+\s*\()[A-Za-z_][\w\s*&<>:,]*?\s+\**\s*(?=[A-Za-z_]*[a-z])([A-Za-z_][\w]*)\s*\(\s*$/,
    nameGroup: 1,
  },
  // Single-line C function decl/def without `{` (rare but appears in
  // kernel): `void free_pages(unsigned long addr, unsigned int order)`
  {
    level: "function",
    regex:
      /^(?![A-Z_]+\s*\()[A-Za-z_][\w\s*&<>:,]*?\s+\**\s*(?=[A-Za-z_]*[a-z])([A-Za-z_][\w]*)\s*\([^)]*\)\s*$/,
    nameGroup: 1,
  },
  { level: "class", regex: /^\s*(?:class|struct)\s+([A-Za-z_][\w]*)/, nameGroup: 1 },
];

const JAVA_KOTLIN_PATTERNS: Pattern[] = [
  {
    level: "function",
    regex:
      /^\s*(?:public|private|protected|static|final|abstract|fun|suspend)?\s*(?:[A-Za-z_][\w<>\[\],\s]*\s+)?([A-Za-z_][\w]*)\s*\([^)]*\)\s*\{?/,
    nameGroup: 1,
  },
  {
    level: "class",
    regex:
      /^\s*(?:public|private|protected|abstract|final|sealed|data|open)?\s*class\s+([A-Za-z_][\w]*)\b/,
    nameGroup: 1,
  },
];

const RUBY_PATTERNS: Pattern[] = [
  { level: "function", regex: /^\s*def\s+([A-Za-z_][\w!?=]*)/, nameGroup: 1 },
  { level: "class", regex: /^\s*class\s+([A-Za-z_][\w]*)/, nameGroup: 1 },
];

const PHP_PATTERNS: Pattern[] = [
  {
    level: "function",
    regex: /^\s*(?:public|private|protected|static)?\s*function\s+([A-Za-z_][\w]*)\s*\(/,
    nameGroup: 1,
  },
  { level: "class", regex: /^\s*class\s+([A-Za-z_][\w]*)\b/, nameGroup: 1 },
];

const SWIFT_PATTERNS: Pattern[] = [
  { level: "function", regex: /^\s*(?:public\s+|private\s+|fileprivate\s+|internal\s+)?func\s+([A-Za-z_][\w]*)\s*[<(]/, nameGroup: 1 },
  { level: "class", regex: /^\s*(?:public\s+|private\s+|final\s+)?(?:class|struct|enum|protocol)\s+([A-Za-z_][\w]*)\b/, nameGroup: 1 },
];

const SCALA_PATTERNS: Pattern[] = [
  { level: "function", regex: /^\s*def\s+([A-Za-z_][\w]*)\s*[\[(]/, nameGroup: 1 },
  { level: "class", regex: /^\s*(?:case\s+)?class\s+([A-Za-z_][\w]*)\b/, nameGroup: 1 },
  { level: "class", regex: /^\s*object\s+([A-Za-z_][\w]*)\b/, nameGroup: 1 },
];

const LANGUAGE_PATTERNS: Record<string, Pattern[]> = {
  TypeScript: TS_JS_PATTERNS,
  TSX: TS_JS_PATTERNS,
  JavaScript: TS_JS_PATTERNS,
  JSX: TS_JS_PATTERNS,
  Python: PY_PATTERNS,
  Go: GO_PATTERNS,
  Rust: RUST_PATTERNS,
  C: C_LIKE_PATTERNS,
  "C++": C_LIKE_PATTERNS,
  "Objective-C": C_LIKE_PATTERNS,
  "Objective-C++": C_LIKE_PATTERNS,
  "C#": JAVA_KOTLIN_PATTERNS,
  Java: JAVA_KOTLIN_PATTERNS,
  Kotlin: JAVA_KOTLIN_PATTERNS,
  Ruby: RUBY_PATTERNS,
  PHP: PHP_PATTERNS,
  Swift: SWIFT_PATTERNS,
  Scala: SCALA_PATTERNS,
};

export function extractSymbolsSync(
  path: string,
  code: string,
): CodeSymbol[] {
  try {
    const language = languageOf(path);
    if (!language) return [];
    const patterns = LANGUAGE_PATTERNS[language];
    if (!patterns) return [];
    const lines = code.split("\n");
    const hits: { line: number; symbol: CodeSymbol; indent: number }[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip obvious comment-only lines so // function foo() {} doesn't match
      if (/^\s*(?:\/\/|#|--|;)/.test(line)) continue;
      for (const p of patterns) {
        const m = line.match(p.regex);
        if (m) {
          const indent = line.match(/^\s*/)?.[0].length ?? 0;
          hits.push({
            line: i + 1,
            indent,
            symbol: {
              level: p.level,
              symbol: m[p.nameGroup],
              path,
              startLine: i + 1,
              endLine: i + 1,
              language,
            },
          });
          break;
        }
      }
    }
    // Resolve endLine by finding the next hit at the same-or-shallower
    // indent. Bracket-based languages are over-approximate but the typing
    // surface allows clamp/snap later.
    for (let i = 0; i < hits.length; i++) {
      const cur = hits[i];
      let end = lines.length;
      for (let j = i + 1; j < hits.length; j++) {
        if (hits[j].indent <= cur.indent) {
          end = hits[j].line - 1;
          break;
        }
      }
      cur.symbol.endLine = Math.max(cur.symbol.startLine, end);
    }
    return hits.map((h) => h.symbol);
  } catch {
    return [];
  }
}

/** Async wrapper so we can swap in a tree-sitter backend later without
 *  changing call sites. */
export async function extractSymbols(
  path: string,
  code: string,
): Promise<CodeSymbol[]> {
  return extractSymbolsSync(path, code);
}

export function findSymbol(
  symbols: CodeSymbol[],
  name: string,
): CodeSymbol | undefined {
  return symbols.find((s) => s.symbol === name);
}

export function extractByLineRange(
  code: string,
  startLine: number,
  endLine: number,
): string {
  const lines = code.split("\n");
  const s = Math.max(0, startLine - 1);
  const e = Math.min(lines.length, endLine);
  return lines.slice(s, e).join("\n");
}
