import { CURATED_REPOS } from "@/core/config/curated";
import { getGithubClient } from "./sessionStarter";

/**
 * Background-fetch the files referenced by the 3 default curated
 * configs so that clicking "Start" feels instant. Uses the github
 * client's in-memory cache so the subsequent `resolveConfig` reads
 * the same response.
 *
 * Silent on failure — preloading is a hint, not a contract. Anything
 * that errors here will just re-fetch (and surface its own error)
 * when the user actually starts the session.
 */
export function preloadCuratedRepos() {
  if (typeof window === "undefined") return;
  // Defer to idle / next tick so we don't compete with first paint.
  const schedule =
    "requestIdleCallback" in window
      ? (cb: () => void) =>
          (
            window as Window & {
              requestIdleCallback: (cb: () => void) => void;
            }
          ).requestIdleCallback(cb)
      : (cb: () => void) => setTimeout(cb, 200);

  schedule(() => {
    const client = getGithubClient();
    for (const c of CURATED_REPOS) {
      const ref = c.config.ref ?? "main";
      const [owner, repo] = c.repo.split("/");
      if (!owner || !repo) continue;
      for (const item of c.config.items) {
        // Fire-and-forget. Result lands in the github client cache.
        client.fetchFileContent(owner, repo, ref, item.path).catch(() => {
          /* swallow */
        });
      }
    }
  });
}
