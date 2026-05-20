/**
 * Decide which repo paths are worth offering for typing practice.
 *
 * Mirrors the filter list in spec.md §"Repo loading":
 *  - directory excludes (node_modules, dist, vendor, …)
 *  - filename excludes (lockfiles, .min.js, .map)
 *  - extension whitelist (preferred source extensions)
 *  - size cap (default 250 KB)
 *  - binary-looking content
 */

export const EXCLUDED_DIRS = [
  "node_modules",
  "vendor",
  "dist",
  "build",
  ".git",
  "coverage",
  "target",
  ".next",
  "out",
  ".cache",
  "venv",
  "__pycache__",
  ".venv",
  ".turbo",
  ".tox",
];

export const EXCLUDED_FILES = [
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "Cargo.lock",
  "poetry.lock",
  "Pipfile.lock",
  "Gemfile.lock",
  "composer.lock",
];

export const PREFERRED_EXTS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".rs",
  ".go",
  ".java",
  ".kt",
  ".kts",
  ".c",
  ".h",
  ".cpp",
  ".cc",
  ".hpp",
  ".cs",
  ".rb",
  ".php",
  ".swift",
  ".scala",
  ".clj",
  ".cljs",
  ".ex",
  ".exs",
  ".lua",
  ".dart",
  ".m",
  ".mm",
];

const EXT_TO_LANG: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TSX",
  ".js": "JavaScript",
  ".jsx": "JSX",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".py": "Python",
  ".rs": "Rust",
  ".go": "Go",
  ".java": "Java",
  ".kt": "Kotlin",
  ".kts": "Kotlin",
  ".c": "C",
  ".h": "C",
  ".cpp": "C++",
  ".cc": "C++",
  ".hpp": "C++",
  ".cs": "C#",
  ".rb": "Ruby",
  ".php": "PHP",
  ".swift": "Swift",
  ".scala": "Scala",
  ".clj": "Clojure",
  ".cljs": "ClojureScript",
  ".ex": "Elixir",
  ".exs": "Elixir",
  ".lua": "Lua",
  ".dart": "Dart",
  ".m": "Objective-C",
  ".mm": "Objective-C++",
};

export const DEFAULT_MAX_FILE_BYTES = 250 * 1024;

export type FilterReason =
  | "ok"
  | "excluded-dir"
  | "excluded-file"
  | "too-large"
  | "minified"
  | "sourcemap"
  | "unsupported-ext";

export type FilterOptions = {
  maxBytes?: number;
};

/** Returns "ok" for files we should expose for typing, or the reject reason. */
export function classifyPath(
  path: string,
  size?: number,
  opts: FilterOptions = {},
): FilterReason {
  const segments = path.split("/");
  for (const seg of segments.slice(0, -1)) {
    if (EXCLUDED_DIRS.includes(seg)) return "excluded-dir";
    if (seg.startsWith(".") && seg !== ".github") {
      // Hide other dotfolders (.next, .vscode, …) but keep them as
      // explicit excludes when listed in EXCLUDED_DIRS above.
      return "excluded-dir";
    }
  }
  const base = segments[segments.length - 1];
  if (EXCLUDED_FILES.includes(base)) return "excluded-file";
  if (base.endsWith(".min.js") || base.endsWith(".min.css")) return "minified";
  if (base.endsWith(".map")) return "sourcemap";

  const max = opts.maxBytes ?? DEFAULT_MAX_FILE_BYTES;
  if (size !== undefined && size > max) return "too-large";

  if (!isPreferredExt(base)) return "unsupported-ext";
  return "ok";
}

export function isUsableSource(
  path: string,
  size?: number,
  opts?: FilterOptions,
): boolean {
  return classifyPath(path, size, opts) === "ok";
}

export function isPreferredExt(filename: string): boolean {
  const lower = filename.toLowerCase();
  return PREFERRED_EXTS.some((ext) => lower.endsWith(ext));
}

export function languageOf(path: string): string | undefined {
  const lower = path.toLowerCase();
  const idx = lower.lastIndexOf(".");
  if (idx === -1) return undefined;
  return EXT_TO_LANG[lower.slice(idx)];
}

/** Quick heuristic: NUL bytes in the first ~1 KB usually mean binary. */
export function looksBinary(text: string): boolean {
  const probe = text.slice(0, 1024);
  for (let i = 0; i < probe.length; i++) {
    if (probe.charCodeAt(i) === 0) return true;
  }
  return false;
}
