import { describe, it, expect } from "vitest";
import { shikiLangFromPath } from "./syntaxHighlight";

describe("shikiLangFromPath", () => {
  it("returns lowercase shiki ids for common extensions", () => {
    expect(shikiLangFromPath("src/foo.ts")).toBe("typescript");
    expect(shikiLangFromPath("src/Foo.TSX")).toBe("tsx");
    expect(shikiLangFromPath("script.py")).toBe("python");
    expect(shikiLangFromPath("init/main.c")).toBe("c");
    expect(shikiLangFromPath("ext.cpp")).toBe("cpp");
    expect(shikiLangFromPath("main.rs")).toBe("rust");
    expect(shikiLangFromPath("Server.java")).toBe("java");
  });

  it("returns null for unknown / extension-less paths", () => {
    expect(shikiLangFromPath("README")).toBeNull();
    expect(shikiLangFromPath("foo.unknownext")).toBeNull();
    expect(shikiLangFromPath("")).toBeNull();
  });

  it("handles multi-dot filenames by using the last extension", () => {
    expect(shikiLangFromPath("server.test.ts")).toBe("typescript");
    expect(shikiLangFromPath("foo.spec.tsx")).toBe("tsx");
  });
});
