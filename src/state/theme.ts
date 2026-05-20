export type Theme = "dark" | "light";

const LS_KEY = "codetype:theme";

/**
 * Resolve the user's preferred theme:
 *  - explicit localStorage choice wins
 *  - otherwise mirror `prefers-color-scheme`
 *  - default dark
 *
 * Safe to call from a non-browser context (returns "dark").
 */
export function resolveInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage?.getItem(LS_KEY);
  if (stored === "dark" || stored === "light") return stored;
  if (window.matchMedia?.("(prefers-color-scheme: light)").matches) return "light";
  return "dark";
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
}

export function persistTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage?.setItem(LS_KEY, theme);
  } catch {
    // Storage may be blocked (private mode, embedded contexts). The
    // theme still applies for this session; preference just won't
    // survive a refresh — acceptable.
  }
}

/**
 * Initialize from storage / system preference and apply BEFORE React
 * renders, so the first paint matches the user's setting. Called from
 * main.tsx.
 */
export function bootstrapTheme(): Theme {
  const t = resolveInitialTheme();
  applyTheme(t);
  return t;
}
