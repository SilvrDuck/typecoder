/**
 * Best-effort parse of user-supplied repo identifiers.
 *
 * Accepted forms:
 *   - owner/repo
 *   - github.com/owner/repo
 *   - https://github.com/owner/repo
 *   - https://github.com/owner/repo.git
 *   - https://github.com/owner/repo/tree/branch
 *   - https://github.com/owner/repo/tree/branch/sub/dir
 *   - https://github.com/owner/repo/blob/branch/path/to/file.ts
 *   - git@github.com:owner/repo.git
 *
 * Rejects: garbage, single segments, repos with slashes in name, etc.
 */

export type ParsedRepo = {
  owner: string;
  repo: string;
  ref?: string;
  /** subdirectory or single file path within the repo */
  path?: string;
};

const NAME_RE = /^[A-Za-z0-9_.][A-Za-z0-9_.\-]{0,98}[A-Za-z0-9_]$|^[A-Za-z0-9_]$/;

export function parseRepoInput(input: string): ParsedRepo | null {
  if (typeof input !== "string") return null;
  let s = input.trim();
  if (!s) return null;

  // SSH form: git@github.com:owner/repo.git
  const ssh = s.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/);
  if (ssh) return validate({ owner: ssh[1], repo: ssh[2] });

  // Strip protocol and host
  s = s.replace(/^https?:\/\//, "");
  // Reject non-repo GitHub subdomains explicitly so a raw or gist URL
  // doesn't silently parse into a bogus owner ("raw.githubusercontent.com").
  if (
    s.startsWith("raw.githubusercontent.com/") ||
    s.startsWith("gist.github.com/") ||
    s.startsWith("api.github.com/")
  ) {
    return null;
  }
  s = s.replace(/^github\.com\//, "");
  // Strip query/hash
  s = s.replace(/[?#].*$/, "");
  // Strip trailing slash
  s = s.replace(/\/+$/, "");
  // Strip .git suffix
  s = s.replace(/\.git$/, "");

  const parts = s.split("/");
  if (parts.length < 2) return null;
  const [owner, repo, kind, ...rest] = parts;
  if (!owner || !repo) return null;

  if (!kind) return validate({ owner, repo });

  if (kind === "tree" || kind === "blob") {
    if (rest.length === 0) return null;
    // NOTE: GitHub allows slashes in branch names ("feat/my-branch"). We
    // can't disambiguate ref="feat/my-branch" from ref="feat", path="my-branch"
    // without an extra API call. We use the first segment as ref and the
    // rest as path; a slash-branch in a pasted URL will use the wrong ref
    // and fall back to default-branch on the metadata fetch.
    const ref = rest[0];
    const path = rest.slice(1).join("/");
    return validate({ owner, repo, ref, path: path || undefined });
  }

  // Unknown segment after owner/repo — be lenient and return owner/repo.
  return validate({ owner, repo });
}

function validate(p: ParsedRepo): ParsedRepo | null {
  if (!NAME_RE.test(p.owner) || !NAME_RE.test(p.repo)) return null;
  return p;
}
