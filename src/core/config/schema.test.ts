import { describe, it, expect } from "vitest";
import { validateConfig, validateConfigText, summarizeItems } from "./schema";

const MINIMAL = {
  version: 1,
  repo: "vitejs/vite",
  title: "Trace Vite",
  items: [{ level: "file", path: "src/index.ts", label: "entry" }],
};

describe("validateConfig — happy paths", () => {
  it("accepts a minimal valid config", () => {
    const r = validateConfig(MINIMAL);
    expect(r.ok).toBe(true);
  });

  it("accepts file with line range", () => {
    const r = validateConfig({
      ...MINIMAL,
      items: [
        { level: "file", path: "x.ts", label: "x", startLine: 10, endLine: 50 },
      ],
    });
    expect(r.ok).toBe(true);
  });

  it("accepts function with symbol", () => {
    const r = validateConfig({
      ...MINIMAL,
      items: [
        { level: "function", path: "x.ts", symbol: "foo", label: "foo" },
      ],
    });
    expect(r.ok).toBe(true);
  });

  it("accepts class with line range only", () => {
    const r = validateConfig({
      ...MINIMAL,
      items: [
        { level: "class", path: "x.ts", label: "C", startLine: 1, endLine: 20 },
      ],
    });
    expect(r.ok).toBe(true);
  });
});

describe("validateConfig — rejects", () => {
  it("rejects missing version", () => {
    const r = validateConfig({ ...MINIMAL, version: undefined });
    expect(r.ok).toBe(false);
  });

  it("rejects version !== 1", () => {
    const r = validateConfig({ ...MINIMAL, version: 2 });
    expect(r.ok).toBe(false);
  });

  it("rejects empty items", () => {
    const r = validateConfig({ ...MINIMAL, items: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].message).toMatch(/At least one item/);
  });

  it("rejects malformed repo string", () => {
    const r = validateConfig({ ...MINIMAL, repo: "vitejs" });
    expect(r.ok).toBe(false);
  });

  it("rejects function without symbol or range", () => {
    const r = validateConfig({
      ...MINIMAL,
      items: [{ level: "function", path: "x.ts", label: "f" }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors[0].path).toEqual(["items", "0"]);
      expect(r.errors[0].message).toMatch(/symbol/);
    }
  });

  it("rejects function with startLine > endLine", () => {
    const r = validateConfig({
      ...MINIMAL,
      items: [
        {
          level: "function",
          path: "x.ts",
          label: "f",
          startLine: 50,
          endLine: 10,
        },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].message).toMatch(/endLine/);
  });

  it("rejects missing path on file item", () => {
    const r = validateConfig({
      ...MINIMAL,
      items: [{ level: "file", label: "x" } as unknown],
    });
    expect(r.ok).toBe(false);
  });

  it("rejects unknown extra fields", () => {
    const r = validateConfig({
      ...MINIMAL,
      items: [
        {
          level: "file",
          path: "x.ts",
          label: "x",
          extraNope: "yes",
        } as unknown,
      ],
    });
    expect(r.ok).toBe(false);
  });
});

describe("validateConfigText", () => {
  it("reports malformed JSON with a parseError", () => {
    const r = validateConfigText("{ not json");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.parseError).toBeTruthy();
  });

  it("accepts well-formed JSON string of a valid config", () => {
    const r = validateConfigText(JSON.stringify(MINIMAL));
    expect(r.ok).toBe(true);
  });

  it("reports schema errors after successful JSON parse", () => {
    const r = validateConfigText(
      JSON.stringify({ ...MINIMAL, items: [] }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.parseError).toBeUndefined();
  });
});

describe("summarizeItems", () => {
  it("counts files, functions, classes", () => {
    expect(
      summarizeItems([
        { level: "file", path: "a", label: "a" },
        { level: "function", path: "a", label: "f", symbol: "f" },
        { level: "function", path: "a", label: "g", symbol: "g" },
        { level: "class", path: "a", label: "C", symbol: "C" },
      ]),
    ).toEqual({ total: 4, files: 1, functions: 2, classes: 1 });
  });
});
