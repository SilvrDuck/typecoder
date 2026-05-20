import { describe, it, expect } from "vitest";
import { DEMO_FILES, findDemoFile, makeDemoTreeEntries } from "./tinyRepo";

describe("tinyRepo", () => {
  it("has multiple languages", () => {
    const langs = new Set(DEMO_FILES.map((f) => f.language));
    expect(langs.size).toBeGreaterThanOrEqual(3);
  });

  it("findDemoFile returns the file by path", () => {
    expect(findDemoFile("src/scheduler.ts")?.language).toBe("TypeScript");
    expect(findDemoFile("nope")).toBeUndefined();
  });

  it("tree entries match files", () => {
    const tree = makeDemoTreeEntries();
    expect(tree.map((t) => t.path).sort()).toEqual(
      DEMO_FILES.map((f) => f.path).sort(),
    );
    expect(tree.every((t) => t.type === "blob")).toBe(true);
  });
});
