/**
 * Glue between the GitHub client + resolveConfig + the Zustand store.
 *
 * The store doesn't import the GitHub client directly so we can wire a
 * test/mock client at the app-init level (and run Playwright with a
 * mocked global fetch).
 */

import { resolveConfig } from "@/core/config/resolveConfig";
import type { CodeTypeConfig } from "@/core/config/schema";
import {
  createGithubClient,
  type FetchLike,
} from "@/core/github/githubClient";
import { useAppStore } from "@/state/useAppStore";

let _client: ReturnType<typeof createGithubClient> | undefined;

export function setupGithubClient(opts: { fetch?: FetchLike } = {}) {
  _client = createGithubClient(opts);
}

export function getGithubClient() {
  if (!_client) _client = createGithubClient();
  return _client;
}

export async function startCuratedSession(
  config: CodeTypeConfig,
  source: string,
) {
  useAppStore.getState().navigate({ name: "loading", title: config.title });
  const client = getGithubClient();
  const resolved = await resolveConfig(config, client.fetchFileContent);
  if (resolved.items.length === 0) {
    const err = resolved.errors[0];
    const kind = err?.detail?.kind;
    const title =
      kind === "rate_limit"
        ? "GitHub rate limit reached"
        : kind === "network"
          ? "Network error"
          : kind === "not_found"
            ? "Repository or path not found"
            : kind === "forbidden"
              ? "GitHub forbade this request"
              : kind === "empty_repo"
                ? "Repository is empty"
                : "Could not start session";
    const detail =
      kind === "rate_limit"
        ? "GitHub limits unauthenticated requests per IP. Try again in a few minutes or pick a curated demo. CodeType does not proxy GitHub — this is your browser talking to GitHub directly."
        : (err?.message ?? "No items resolved.");
    useAppStore.getState().navigate({ name: "error", title, detail });
    return;
  }
  useAppStore.getState().startSession(config, resolved, source);
}
