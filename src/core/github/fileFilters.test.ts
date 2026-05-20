import { describe, it, expect } from "vitest";
import {
  classifyPath,
  isUsableSource,
  isPreferredExt,
  languageOf,
  looksBinary,
} from "./fileFilters";

describe("classifyPath", () => {
  it("accepts a typical source file", () => {
    expect(classifyPath("src/index.ts", 1024)).toBe("ok");
  });

  it("rejects files in excluded directories", () => {
    expect(classifyPath("node_modules/foo/bar.ts", 100)).toBe("excluded-dir");
    expect(classifyPath("dist/index.js", 100)).toBe("excluded-dir");
    expect(classifyPath("vendor/x/y.go", 100)).toBe("excluded-dir");
  });

  it("rejects dot directories except .github", () => {
    expect(classifyPath(".next/foo/bar.ts", 100)).toBe("excluded-dir");
    expect(classifyPath(".github/workflows/ci.yml", 100)).not.toBe("excluded-dir");
  });

  it("rejects lockfiles", () => {
    expect(classifyPath("pnpm-lock.yaml", 100)).toBe("excluded-file");
    expect(classifyPath("package-lock.json", 100)).toBe("excluded-file");
    expect(classifyPath("Cargo.lock", 100)).toBe("excluded-file");
  });

  it("rejects minified and source maps", () => {
    expect(classifyPath("lib/foo.min.js", 100)).toBe("minified");
    expect(classifyPath("lib/foo.js.map", 100)).toBe("sourcemap");
  });

  it("rejects unsupported extensions", () => {
    expect(classifyPath("README.md", 100)).toBe("unsupported-ext");
    expect(classifyPath("image.png", 100)).toBe("unsupported-ext");
  });

  it("rejects files over the size cap", () => {
    expect(classifyPath("src/big.ts", 1_000_000)).toBe("too-large");
  });

  it("size cap is configurable", () => {
    expect(classifyPath("src/foo.ts", 1024, { maxBytes: 500 })).toBe("too-large");
  });
});

describe("isUsableSource", () => {
  it("matches classifyPath ok-ness", () => {
    expect(isUsableSource("src/foo.ts", 100)).toBe(true);
    expect(isUsableSource("node_modules/foo.ts", 100)).toBe(false);
  });
});

describe("isPreferredExt + languageOf", () => {
  it("maps ts/tsx to TypeScript/TSX", () => {
    expect(languageOf("a.ts")).toBe("TypeScript");
    expect(languageOf("a.tsx")).toBe("TSX");
    expect(isPreferredExt("a.ts")).toBe(true);
    expect(isPreferredExt("a.md")).toBe(false);
  });

  it("handles uppercase extensions", () => {
    expect(isPreferredExt("FOO.TS")).toBe(true);
    expect(languageOf("FOO.RS")).toBe("Rust");
  });
});

describe("looksBinary", () => {
  it("flags NUL byte in first 1 KB as binary", () => {
    expect(looksBinary("hello\0world")).toBe(true);
  });

  it("does not flag plain text", () => {
    expect(looksBinary("hello\nworld\t")).toBe(false);
    expect(looksBinary("// 漢字 ünïcode 🚀")).toBe(false);
  });
});
