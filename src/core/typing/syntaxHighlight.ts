import type { BundledLanguage, BundledTheme, HighlighterGeneric } from "shiki";

/**
 * Per-character syntax colors produced from Shiki tokenization. The
 * returned array maps target text index → CSS color string (hex). For
 * characters Shiki didn't tokenize (e.g. blank lines, EOT) the entry
 * is an empty string and the caller falls back to its default color.
 */
export type TokenColorMap = string[];

const EXT_TO_SHIKI: Record<string, BundledLanguage> = {
  ".ts": "typescript",
  ".tsx": "tsx",
  ".js": "javascript",
  ".jsx": "jsx",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".py": "python",
  ".rs": "rust",
  ".go": "go",
  ".java": "java",
  ".kt": "kotlin",
  ".kts": "kotlin",
  ".c": "c",
  ".h": "c",
  ".cpp": "cpp",
  ".cc": "cpp",
  ".hpp": "cpp",
  ".cs": "csharp",
  ".rb": "ruby",
  ".php": "php",
  ".swift": "swift",
  ".scala": "scala",
  ".clj": "clojure",
  ".cljs": "clojure",
  ".ex": "elixir",
  ".exs": "elixir",
  ".lua": "lua",
  ".dart": "dart",
  ".m": "objective-c",
  ".mm": "objective-cpp",
  ".json": "json",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".md": "markdown",
  ".sh": "shell",
  ".bash": "shell",
  ".html": "html",
  ".css": "css",
  ".scss": "scss",
  ".vue": "vue",
  ".svelte": "svelte",
  ".sql": "sql",
  ".toml": "toml",
  ".xml": "xml",
};

export function shikiLangFromPath(path: string): BundledLanguage | null {
  const idx = path.toLowerCase().lastIndexOf(".");
  if (idx === -1) return null;
  const ext = path.toLowerCase().slice(idx);
  return EXT_TO_SHIKI[ext] ?? null;
}

type AnyHighlighter = HighlighterGeneric<BundledLanguage, BundledTheme>;

let _hlPromise: Promise<AnyHighlighter> | null = null;

async function getOrCreateHighlighter(): Promise<AnyHighlighter> {
  if (!_hlPromise) {
    _hlPromise = (async () => {
      const { createHighlighter } = await import("shiki");
      return createHighlighter({
        themes: ["github-dark", "github-light"],
        langs: [],
      });
    })();
  }
  return _hlPromise;
}

/**
 * Tokenize `code` with Shiki and flatten to a per-character color map
 * aligned with the original string (including newlines and trailing
 * empty positions). Returns `[]` if the language is unsupported.
 */
export async function buildTokenColorMap(
  code: string,
  lang: BundledLanguage,
  themeName: "dark" | "light",
): Promise<TokenColorMap> {
  if (!code) return [];
  const hl = await getOrCreateHighlighter();
  if (!hl.getLoadedLanguages().includes(lang)) {
    try {
      await hl.loadLanguage(lang);
    } catch {
      return [];
    }
  }
  const theme: BundledTheme = themeName === "dark" ? "github-dark" : "github-light";
  let tokens;
  try {
    tokens = hl.codeToTokens(code, { lang, theme }).tokens;
  } catch {
    return [];
  }

  // Walk the input alongside the tokens. Shiki splits by line, so
  // newlines do not appear in the token stream — we emit a blank
  // entry for each `\n` so indices stay aligned.
  const colors: string[] = [];
  let codePos = 0;
  for (let li = 0; li < tokens.length; li++) {
    const line = tokens[li];
    for (const tok of line) {
      const content = tok.content;
      for (let i = 0; i < content.length; i++) {
        colors[codePos++] = tok.color ?? "";
      }
    }
    if (li < tokens.length - 1) {
      // line break in original input → blank slot
      colors[codePos++] = "";
    }
  }
  // Pad to code length in case Shiki dropped trailing chars.
  while (colors.length < code.length) colors.push("");
  return colors;
}
