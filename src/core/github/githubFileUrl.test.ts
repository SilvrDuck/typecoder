import { describe, it, expect } from "vitest";
import { buildGithubFileHref } from "./githubFileUrl";

describe("buildGithubFileHref", () => {
  it("builds a blob URL with ref and path", () => {
    expect(
      buildGithubFileHref({
        repo: "facebook/react",
        ref: "main",
        path: "packages/react/src/React.js",
      }),
    ).toBe("https://github.com/facebook/react/blob/main/packages/react/src/React.js");
  });

  it("appends a single-line anchor when only startLine is given", () => {
    expect(
      buildGithubFileHref({
        repo: "torvalds/linux",
        ref: "master",
        path: "init/main.c",
        startLine: 42,
      }),
    ).toBe("https://github.com/torvalds/linux/blob/master/init/main.c#L42");
  });

  it("appends a range anchor when both startLine and endLine are given", () => {
    expect(
      buildGithubFileHref({
        repo: "torvalds/linux",
        ref: "v6.1",
        path: "init/main.c",
        startLine: 100,
        endLine: 140,
      }),
    ).toBe("https://github.com/torvalds/linux/blob/v6.1/init/main.c#L100-L140");
  });

  it("returns null for the bundled demo repo", () => {
    expect(
      buildGithubFileHref({
        repo: "demo/tiny-codebase",
        ref: "main",
        path: "src/scheduler.ts",
      }),
    ).toBeNull();
  });

  it("returns null for malformed repos (single segment, blank, extra slashes)", () => {
    expect(buildGithubFileHref({ repo: "", ref: "main", path: "x" })).toBeNull();
    expect(buildGithubFileHref({ repo: "single", ref: "main", path: "x" })).toBeNull();
    expect(
      buildGithubFileHref({ repo: "a/b/c", ref: "main", path: "x" }),
    ).toBeNull();
  });

  it("falls back to 'main' when ref is blank", () => {
    expect(
      buildGithubFileHref({
        repo: "facebook/react",
        ref: "",
        path: "README.md",
      }),
    ).toBe("https://github.com/facebook/react/blob/main/README.md");
  });

  it("URI-encodes ref and path segments to handle special characters", () => {
    expect(
      buildGithubFileHref({
        repo: "owner/repo",
        ref: "feature/branch with space",
        path: "src/a b/c.ts",
      }),
    ).toBe(
      "https://github.com/owner/repo/blob/feature%2Fbranch%20with%20space/src/a%20b/c.ts",
    );
  });

  it("returns null when path is empty", () => {
    expect(
      buildGithubFileHref({ repo: "facebook/react", ref: "main", path: "" }),
    ).toBeNull();
  });
});
