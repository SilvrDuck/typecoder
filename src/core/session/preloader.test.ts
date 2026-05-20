import { describe, it, expect, vi, beforeEach } from "vitest";
import { preloadCuratedRepos } from "./preloader";
import { setupGithubClient } from "./sessionStarter";
import { CURATED_REPOS } from "@/core/config/curated";

describe("preloadCuratedRepos", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("fetches every file referenced by the 3 curated configs", async () => {
    const fetchSpy = vi.fn(async () => {
      return new Response("ok content", {
        status: 200,
        headers: { "content-type": "text/plain" },
      });
    });
    setupGithubClient({ fetch: fetchSpy as unknown as typeof fetch });

    const expectedCalls = CURATED_REPOS.reduce(
      (sum, c) => sum + c.config.items.length,
      0,
    );

    preloadCuratedRepos();
    vi.runAllTimers();
    // Flush the microtask queue so fire-and-forget fetches are issued.
    await Promise.resolve();
    await Promise.resolve();

    expect(fetchSpy).toHaveBeenCalledTimes(expectedCalls);
  });

  it("is silent on fetch failure", () => {
    const fetchSpy = vi.fn(async () => {
      throw new Error("boom");
    });
    setupGithubClient({ fetch: fetchSpy as unknown as typeof fetch });

    expect(() => {
      preloadCuratedRepos();
      vi.runAllTimers();
    }).not.toThrow();
  });
});
