import { describe, it, expect } from "vitest";
import { buildHash, parseHash } from "./router";

describe("router", () => {
  it("buildHash maps view names to paths", () => {
    expect(buildHash("landing")).toBe("#/");
    expect(buildHash("custom-hub")).toBe("#/custom");
    expect(buildHash("paste-config")).toBe("#/custom/paste");
    expect(buildHash("typing")).toBe("#/typing");
  });

  it("buildHash appends session param when given", () => {
    expect(buildHash("typing", "ABC123")).toBe("#/typing?s=ABC123");
    expect(buildHash("summary", "X")).toBe("#/summary?s=X");
  });

  it("parseHash recognizes empty hash as landing", () => {
    expect(parseHash("")).toEqual({ viewName: "landing", sessionParam: null });
    expect(parseHash("#/")).toEqual({ viewName: "landing", sessionParam: null });
  });

  it("parseHash recognizes known paths and extracts session param", () => {
    expect(parseHash("#/typing?s=ABC")).toEqual({
      viewName: "typing",
      sessionParam: "ABC",
    });
    expect(parseHash("#/custom/paste")).toEqual({
      viewName: "paste-config",
      sessionParam: null,
    });
  });

  it("parseHash returns null viewName for unknown paths", () => {
    expect(parseHash("#/nonsense").viewName).toBeNull();
  });

  it("buildHash → parseHash round-trips", () => {
    const cases: Array<[string, string?]> = [
      ["landing"],
      ["custom-hub"],
      ["paste-config"],
      ["prompt-builder"],
      ["load-any-repo"],
      ["typing", "ABCDEF"],
      ["summary", "XYZ"],
    ];
    for (const [name, s] of cases) {
      const hash = buildHash(name as Parameters<typeof buildHash>[0], s);
      const parsed = parseHash(hash);
      expect(parsed.viewName).toBe(name);
      expect(parsed.sessionParam).toBe(s ?? null);
    }
  });
});
