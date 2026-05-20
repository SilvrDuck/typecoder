import { describe, it, expect } from "vitest";
import {
  PROMPT_TEMPLATES,
  buildPrompt,
  getTemplate,
  PROMPT_SCHEMA_TEXT,
} from "./promptTemplates";

describe("prompt templates", () => {
  it("has 10 distinct templates matching the spec", () => {
    expect(PROMPT_TEMPLATES).toHaveLength(10);
    const ids = new Set(PROMPT_TEMPLATES.map((t) => t.id));
    expect(ids.size).toBe(10);
    expect(ids.has("understand-codebase")).toBe(true);
    expect(ids.has("trace-execution")).toBe(true);
    expect(ids.has("learn-public-api")).toBe(true);
    expect(ids.has("focus-architecture")).toBe(true);
    expect(ids.has("focus-tests")).toBe(true);
    expect(ids.has("focus-performance")).toBe(true);
    expect(ids.has("focus-data-model")).toBe(true);
    expect(ids.has("focus-ui")).toBe(true);
    expect(ids.has("focus-build")).toBe(true);
    expect(ids.has("custom")).toBe(true);
  });

  it("each template has distinct copy fields (no copy-paste duplicates)", () => {
    const bestFors = new Set(PROMPT_TEMPLATES.map((t) => t.bestFor));
    expect(bestFors.size).toBe(10);
  });

  it("each template has at least 3 bullets and a non-empty prioritize/avoid", () => {
    for (const t of PROMPT_TEMPLATES) {
      expect(t.bullets.length).toBeGreaterThanOrEqual(3);
      expect(t.prioritize.length).toBeGreaterThan(0);
      expect(t.avoid.length).toBeGreaterThan(0);
    }
  });
});

describe("getTemplate", () => {
  it("returns the requested template", () => {
    expect(getTemplate("trace-execution").label).toBe("Trace the main execution path");
  });

  it("throws on unknown id", () => {
    expect(() => getTemplate("nope" as never)).toThrow(/Unknown prompt template/);
  });
});

describe("buildPrompt", () => {
  it("includes repo, ref, outcome, schema, prioritize, avoid", () => {
    const p = buildPrompt({
      repo: "vitejs/vite",
      ref: "main",
      templateId: "trace-execution",
    });
    expect(p).toContain("Repository: vitejs/vite");
    expect(p).toContain("Ref: main");
    expect(p).toContain("Outcome: Trace the main execution path");
    expect(p).toContain(PROMPT_SCHEMA_TEXT);
    expect(p).toContain("Prioritize:");
    expect(p).toContain("CLI or app entry points");
    expect(p).toContain("Avoid:");
    expect(p).toContain("test-only paths");
  });

  it("defaults ref to main when unspecified", () => {
    const p = buildPrompt({
      repo: "owner/repo",
      templateId: "understand-codebase",
    });
    expect(p).toContain("Ref: main");
  });

  it("custom focus reveals the user's focus string in the outcome line", () => {
    const p = buildPrompt({
      repo: "owner/repo",
      templateId: "custom",
      customFocus: "understand plugin loading and lifecycle",
    });
    expect(p).toContain("Custom focus: understand plugin loading and lifecycle");
  });

  it("custom focus without text falls back to a helpful placeholder", () => {
    const p = buildPrompt({
      repo: "owner/repo",
      templateId: "custom",
    });
    expect(p).toContain("(unspecified");
  });

  it("different templates produce different prompts", () => {
    const a = buildPrompt({ repo: "x/y", templateId: "focus-tests" });
    const b = buildPrompt({ repo: "x/y", templateId: "focus-ui" });
    expect(a).not.toBe(b);
    expect(a).toContain("high-signal tests");
    expect(b).toContain("root components");
  });

  it("always tells the LLM to use real paths and symbols", () => {
    for (const t of PROMPT_TEMPLATES) {
      const p = buildPrompt({ repo: "x/y", templateId: t.id });
      expect(p).toContain("Use real paths from the repo.");
      expect(p).toContain("Use real symbols from the repo.");
      expect(p).toContain("Do not invent paths.");
      expect(p).toContain("Output valid JSON only");
    }
  });

  it("includes the typing-practice sizing hint (8 to 20 items)", () => {
    const p = buildPrompt({ repo: "x/y", templateId: "understand-codebase" });
    expect(p).toContain("Prefer 8 to 20 items");
  });
});
