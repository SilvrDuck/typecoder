import { describe, it, expect } from "vitest";
import { parseRepoInput } from "./parseRepoInput";

describe("parseRepoInput", () => {
  it("parses owner/repo", () => {
    expect(parseRepoInput("vitejs/vite")).toEqual({ owner: "vitejs", repo: "vite" });
  });

  it("parses github.com URL", () => {
    expect(parseRepoInput("https://github.com/vitejs/vite")).toEqual({
      owner: "vitejs",
      repo: "vite",
    });
  });

  it("strips .git suffix", () => {
    expect(parseRepoInput("https://github.com/vitejs/vite.git")).toEqual({
      owner: "vitejs",
      repo: "vite",
    });
  });

  it("strips trailing slash and protocol omission", () => {
    expect(parseRepoInput("github.com/vitejs/vite/")).toEqual({
      owner: "vitejs",
      repo: "vite",
    });
  });

  it("parses tree URL with branch", () => {
    expect(parseRepoInput("https://github.com/vitejs/vite/tree/feat/foo")).toEqual({
      owner: "vitejs",
      repo: "vite",
      ref: "feat",
      path: "foo",
    });
  });

  it("parses tree URL with branch and sub-path", () => {
    expect(parseRepoInput("https://github.com/vitejs/vite/tree/main/packages/vite")).toEqual({
      owner: "vitejs",
      repo: "vite",
      ref: "main",
      path: "packages/vite",
    });
  });

  it("parses blob URL", () => {
    expect(
      parseRepoInput("https://github.com/vitejs/vite/blob/main/packages/vite/src/cli.ts"),
    ).toEqual({
      owner: "vitejs",
      repo: "vite",
      ref: "main",
      path: "packages/vite/src/cli.ts",
    });
  });

  it("parses SSH form", () => {
    expect(parseRepoInput("git@github.com:vitejs/vite.git")).toEqual({
      owner: "vitejs",
      repo: "vite",
    });
  });

  it("strips query and hash", () => {
    expect(parseRepoInput("https://github.com/vitejs/vite?tab=readme")).toEqual({
      owner: "vitejs",
      repo: "vite",
    });
  });

  it("rejects garbage", () => {
    expect(parseRepoInput("")).toBeNull();
    expect(parseRepoInput("hello")).toBeNull();
    expect(parseRepoInput("not/a/valid/path/no")).toEqual({ owner: "not", repo: "a" });
    expect(parseRepoInput("///")).toBeNull();
    expect(parseRepoInput("foo//bar")).toBeNull();
  });

  it("rejects names with illegal characters", () => {
    expect(parseRepoInput("foo bar/baz")).toBeNull();
    expect(parseRepoInput("foo/bar baz")).toBeNull();
  });

  it("rejects non-repo GitHub subdomains", () => {
    expect(parseRepoInput("https://raw.githubusercontent.com/foo/bar/main/x.ts")).toBeNull();
    expect(parseRepoInput("https://gist.github.com/foo/abc123")).toBeNull();
    expect(parseRepoInput("https://api.github.com/repos/foo/bar")).toBeNull();
  });

  it("trims whitespace", () => {
    expect(parseRepoInput("  vitejs/vite  ")).toEqual({ owner: "vitejs", repo: "vite" });
  });
});
