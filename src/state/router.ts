import type { View } from "./useAppStore";

/**
 * View → hash path. Inverse: parseHash.
 *
 * The app uses hash routing because it's served as static assets on
 * GitHub Pages, which doesn't rewrite arbitrary paths to index.html.
 */
const VIEW_TO_PATH: Record<View["name"], string> = {
  landing: "",
  "type-right-away": "curated",
  "custom-hub": "custom",
  "paste-config": "custom/paste",
  "prompt-builder": "custom/build",
  "load-any-repo": "custom/load",
  loading: "loading",
  typing: "typing",
  summary: "summary",
  error: "error",
};

const PATH_TO_VIEW_NAME: Record<string, View["name"]> = Object.fromEntries(
  Object.entries(VIEW_TO_PATH)
    .filter(([, p]) => p !== "")
    .map(([name, path]) => [path, name as View["name"]]),
);

export function buildHash(viewName: View["name"], sessionParam?: string): string {
  const path = VIEW_TO_PATH[viewName];
  const query = sessionParam ? `?s=${sessionParam}` : "";
  return path ? `#/${path}${query}` : "#/";
}

/**
 * Build a full https://… URL that, when visited, restores the same
 * view + session state. Used by the share button.
 */
export function buildShareUrl(viewName: View["name"], sessionParam?: string): string {
  const base = typeof window !== "undefined"
    ? `${window.location.origin}${window.location.pathname}`
    : "";
  return `${base}${buildHash(viewName, sessionParam)}`;
}

export type ParsedHash = {
  viewName: View["name"] | null;
  sessionParam: string | null;
};

export function parseHash(hash: string): ParsedHash {
  const stripped = hash.startsWith("#/")
    ? hash.slice(2)
    : hash.startsWith("#")
      ? hash.slice(1)
      : hash;
  if (!stripped) return { viewName: "landing", sessionParam: null };
  const [path, query = ""] = stripped.split("?");
  const params = new URLSearchParams(query);
  const viewName = PATH_TO_VIEW_NAME[path] ?? null;
  return { viewName, sessionParam: params.get("s") };
}
