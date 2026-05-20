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
    useAppStore.getState().navigate({
      name: "error",
      title: "Could not start session",
      detail: err?.message ?? "No items resolved.",
    });
    return;
  }
  useAppStore.getState().startSession(config, resolved, source);
}
