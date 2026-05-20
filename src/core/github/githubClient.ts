/**
 * Browser-side GitHub client. No server proxy. No tokens. Unauthenticated
 * requests only — the user's own IP eats the rate limit, never the host.
 *
 * Exposes:
 *   fetchRepoMeta(owner, repo)
 *   fetchRepoTree(owner, repo, ref)
 *   fetchFileContent(owner, repo, ref, path)
 *
 * Uses an in-memory cache that lives for the page load. Nothing is
 * persisted to localStorage or IndexedDB.
 */

import { looksBinary } from "./fileFilters";

export type RepoMeta = {
  owner: string;
  repo: string;
  defaultBranch: string;
  description?: string;
  size?: number;
  language?: string;
  isPrivate: boolean;
};

export type TreeEntry = {
  path: string;
  type: "blob" | "tree" | "commit";
  size?: number;
  sha: string;
};

export type RepoTree = {
  truncated: boolean;
  entries: TreeEntry[];
  sha: string;
};

export type GithubErrorKind =
  | "rate_limit"
  | "not_found"
  | "forbidden"
  | "empty_repo"
  | "file_too_large"
  | "binary_file"
  | "validation_error"
  | "network"
  | "invalid_response"
  | "unknown";

/**
 * NOTE on tree truncation: GitHub's recursive tree endpoint returns
 * `{ truncated: true }` with partial entries for huge repos. We surface
 * that as `RepoTree.truncated` on the ok-path rather than an error,
 * because the partial entries are still useful — the caller (UI) is
 * responsible for showing the user a "showing partial results" banner.
 * There is no `truncated_tree` error kind for this reason.
 */

export type GithubError = {
  kind: GithubErrorKind;
  message: string;
  status?: number;
  retryAfter?: number;
};

export type GithubResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: GithubError };

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type GithubClientOptions = {
  fetch?: FetchLike;
  apiBase?: string;
  rawBase?: string;
  maxFileBytes?: number;
};

const DEFAULT_API = "https://api.github.com";
const DEFAULT_RAW = "https://raw.githubusercontent.com";
const DEFAULT_MAX = 250 * 1024;

export class GithubCache {
  meta = new Map<string, RepoMeta>();
  tree = new Map<string, RepoTree>();
  file = new Map<string, string>();
  clear() {
    this.meta.clear();
    this.tree.clear();
    this.file.clear();
  }
}

export function createGithubClient(opts: GithubClientOptions = {}) {
  const cache = new GithubCache();
  const f: FetchLike =
    opts.fetch ?? ((u, init) => (globalThis.fetch as FetchLike)(u, init));
  const apiBase = opts.apiBase ?? DEFAULT_API;
  const rawBase = opts.rawBase ?? DEFAULT_RAW;
  const maxFileBytes = opts.maxFileBytes ?? DEFAULT_MAX;

  async function fetchRepoMeta(
    owner: string,
    repo: string,
  ): Promise<GithubResult<RepoMeta>> {
    const key = `${owner}/${repo}`;
    const hit = cache.meta.get(key);
    if (hit) return { ok: true, value: hit };
    const url = `${apiBase}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    let res: Response;
    try {
      res = await f(url, { headers: { Accept: "application/vnd.github+json" } });
    } catch (e) {
      return netError(e);
    }
    const err = mapHttp(res);
    if (err) return { ok: false, error: err };
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return invalidResponse();
    }
    const j = json as Record<string, unknown>;
    if (typeof j.default_branch !== "string") return invalidResponse();
    const meta: RepoMeta = {
      owner,
      repo,
      defaultBranch: j.default_branch,
      description: typeof j.description === "string" ? j.description : undefined,
      size: typeof j.size === "number" ? j.size : undefined,
      language: typeof j.language === "string" ? j.language : undefined,
      isPrivate: j.private === true,
    };
    cache.meta.set(key, meta);
    return { ok: true, value: meta };
  }

  async function fetchRepoTree(
    owner: string,
    repo: string,
    ref: string,
  ): Promise<GithubResult<RepoTree>> {
    const key = `${owner}/${repo}@${ref}`;
    const hit = cache.tree.get(key);
    if (hit) return { ok: true, value: hit };
    const url = `${apiBase}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(ref)}?recursive=1`;
    let res: Response;
    try {
      res = await f(url, { headers: { Accept: "application/vnd.github+json" } });
    } catch (e) {
      return netError(e);
    }
    const err = mapHttp(res);
    if (err) return { ok: false, error: err };
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return invalidResponse();
    }
    const j = json as Record<string, unknown>;
    if (!Array.isArray(j.tree)) return invalidResponse();
    const entries: TreeEntry[] = j.tree
      .map((raw: unknown) => {
        const e = raw as Record<string, unknown>;
        if (typeof e.path !== "string" || typeof e.sha !== "string") return null;
        const type =
          e.type === "blob" || e.type === "tree" || e.type === "commit"
            ? e.type
            : null;
        if (!type) return null;
        const entry: TreeEntry = { path: e.path, type, sha: e.sha };
        if (typeof e.size === "number") entry.size = e.size;
        return entry;
      })
      .filter((x): x is TreeEntry => x !== null);
    const tree: RepoTree = {
      truncated: j.truncated === true,
      entries,
      sha: typeof j.sha === "string" ? j.sha : "",
    };
    cache.tree.set(key, tree);
    return { ok: true, value: tree };
  }

  async function fetchFileContent(
    owner: string,
    repo: string,
    ref: string,
    path: string,
  ): Promise<GithubResult<string>> {
    const key = `${owner}/${repo}@${ref}:${path}`;
    const hit = cache.file.get(key);
    if (hit !== undefined) return { ok: true, value: hit };
    // Use raw.githubusercontent.com — way better for large source files
    // and unauthenticated. Encode path segments individually.
    const safePath = path
      .split("/")
      .map((p) => encodeURIComponent(p))
      .join("/");
    const url = `${rawBase}/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(ref)}/${safePath}`;
    let res: Response;
    try {
      res = await f(url);
    } catch (e) {
      return netError(e);
    }
    const err = mapHttp(res);
    if (err) return { ok: false, error: err };
    const len = Number(res.headers.get("content-length") ?? "0");
    if (len > 0 && len > maxFileBytes) {
      return {
        ok: false,
        error: {
          kind: "file_too_large",
          message: `File exceeds ${maxFileBytes} bytes`,
          status: res.status,
        },
      };
    }
    let text: string;
    try {
      text = await res.text();
    } catch {
      return invalidResponse();
    }
    if (text.length > maxFileBytes) {
      return {
        ok: false,
        error: {
          kind: "file_too_large",
          message: `File exceeds ${maxFileBytes} bytes`,
        },
      };
    }
    if (looksBinary(text)) {
      return {
        ok: false,
        error: { kind: "binary_file", message: "File appears to be binary" },
      };
    }
    cache.file.set(key, text);
    return { ok: true, value: text };
  }

  return {
    fetchRepoMeta,
    fetchRepoTree,
    fetchFileContent,
    cache,
  };
}

function mapHttp(res: Response): GithubError | null {
  if (res.ok) return null;
  const status = res.status;
  if (status === 403) {
    const remaining = res.headers.get("x-ratelimit-remaining");
    const reset = res.headers.get("x-ratelimit-reset");
    if (remaining === "0") {
      const resetNum = reset !== null ? Number(reset) : NaN;
      const retryAfter =
        Number.isFinite(resetNum)
          ? Math.max(0, resetNum * 1000 - Date.now())
          : undefined;
      return {
        kind: "rate_limit",
        message: "GitHub rate limit reached.",
        status,
        retryAfter,
      };
    }
    return { kind: "forbidden", message: "GitHub forbade this request.", status };
  }
  if (status === 404) {
    return { kind: "not_found", message: "Repository or path not found.", status };
  }
  if (status === 409) {
    return {
      kind: "empty_repo",
      message: "Repository appears to be empty.",
      status,
    };
  }
  if (status === 422) {
    return {
      kind: "validation_error",
      message: "GitHub could not process this request.",
      status,
    };
  }
  return {
    kind: "unknown",
    message: `GitHub responded with ${status}.`,
    status,
  };
}

function netError(e: unknown): { ok: false; error: GithubError } {
  return {
    ok: false,
    error: {
      kind: "network",
      message:
        e instanceof Error ? `Network error: ${e.message}` : "Network error.",
    },
  };
}

function invalidResponse(): { ok: false; error: GithubError } {
  return {
    ok: false,
    error: {
      kind: "invalid_response",
      message: "GitHub returned a malformed response.",
    },
  };
}
