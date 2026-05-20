/**
 * Build a GitHub blob URL for a file in a public repo, with an optional
 * line-range anchor. Returns null when the repo is the bundled demo repo
 * or the input shape is invalid — callers should render plain text in
 * that case rather than a broken link.
 */
export function buildGithubFileHref(opts: {
  repo: string;
  ref: string;
  path: string;
  startLine?: number;
  endLine?: number;
}): string | null {
  if (!opts.repo || opts.repo.startsWith("demo/")) return null;
  if (!/^[^/]+\/[^/]+$/.test(opts.repo)) return null;
  if (!opts.path) return null;
  const ref = encodeURIComponent(opts.ref || "main");
  const path = opts.path
    .split("/")
    .map((p) => encodeURIComponent(p))
    .join("/");
  let url = `https://github.com/${opts.repo}/blob/${ref}/${path}`;
  if (opts.startLine && opts.endLine) {
    url += `#L${opts.startLine}-L${opts.endLine}`;
  } else if (opts.startLine) {
    url += `#L${opts.startLine}`;
  }
  return url;
}
