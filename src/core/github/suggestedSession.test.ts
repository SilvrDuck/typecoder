import { describe, it, expect } from "vitest";
import { buildSuggestedSession, detectDominantLanguage } from "./suggestedSession";
import type { TreeEntry } from "./githubClient";

const blob = (path: string, size = 1_500): TreeEntry => ({
  path,
  type: "blob",
  sha: path,
  size,
});

describe("buildSuggestedSession", () => {
  it("returns up to `length` files, dominant-language filtered", () => {
    const entries = [
      blob("src/index.ts"),
      blob("src/cli.ts"),
      blob("src/server/index.ts"),
      blob("src/router.ts"),
      blob("src/util/string.ts"),
      blob("scripts/helper.py"), // minority language
      blob("README.md"), // filtered out
      blob("node_modules/foo.ts"), // filtered out
    ];
    const s = buildSuggestedSession(entries, { length: "short" });
    expect(s.files.length).toBeLessThanOrEqual(6);
    expect(s.files.every((f) => f.path.endsWith(".ts"))).toBe(true);
    expect(s.files.find((f) => f.path === "node_modules/foo.ts")).toBeUndefined();
    expect(s.files.find((f) => f.path === "README.md")).toBeUndefined();
  });

  it("prioritizes index/cli/server-named files", () => {
    const entries = [
      blob("packages/x/y/z/deep_helper.ts"),
      blob("src/cli.ts"),
    ];
    const s = buildSuggestedSession(entries);
    expect(s.files[0].path).toBe("src/cli.ts");
  });

  it("depriorizes test files", () => {
    const entries = [
      blob("src/index.ts"),
      blob("src/foo.test.ts"),
      blob("__tests__/foo.ts"),
    ];
    const s = buildSuggestedSession(entries, { length: "short" });
    const paths = s.files.map((f) => f.path);
    expect(paths[0]).toBe("src/index.ts");
  });

  it("brutal difficulty allows larger files", () => {
    const entries = [blob("src/big.ts", 100_000)];
    const readable = buildSuggestedSession(entries, { difficulty: "readable" });
    const brutal = buildSuggestedSession(entries, { difficulty: "brutal" });
    expect(readable.files).toHaveLength(0);
    expect(brutal.files).toHaveLength(1);
  });

  it("language override forces a single language", () => {
    const entries = [
      blob("src/a.ts"),
      blob("src/b.py"),
      blob("src/c.py"),
    ];
    const s = buildSuggestedSession(entries, { language: "Python" });
    expect(s.files.every((f) => f.path.endsWith(".py"))).toBe(true);
  });

  it("path filter narrows the queue", () => {
    const entries = [
      blob("src/server/index.ts"),
      blob("src/client/index.ts"),
    ];
    const s = buildSuggestedSession(entries, { pathFilter: "client" });
    expect(s.files.every((f) => f.path.includes("client"))).toBe(true);
  });
});

describe("buildSuggestedSession — empty signal", () => {
  it("returns empty files when no usable source matches", () => {
    const s = buildSuggestedSession([
      blob("README.md"),
      blob("LICENSE"),
    ]);
    expect(s.files).toEqual([]);
    expect(s.estimatedSnippets).toBe(0);
  });

  it("depriorizes Go _test.go files", () => {
    const entries = [
      blob("internal/cache/lru.go"),
      blob("internal/cache/lru_test.go"),
    ];
    const s = buildSuggestedSession(entries, { length: "short" });
    expect(s.files[0].path).toBe("internal/cache/lru.go");
  });
});

describe("detectDominantLanguage", () => {
  it("returns the most common preferred-ext language", () => {
    const entries = [
      blob("a.ts"),
      blob("b.ts"),
      blob("c.py"),
    ];
    expect(detectDominantLanguage(entries)).toBe("TypeScript");
  });

  it("returns undefined for an empty preferred-ext set", () => {
    expect(detectDominantLanguage([blob("readme.md")])).toBeUndefined();
  });
});
