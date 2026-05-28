import { describe, it, expect, vi } from "vitest";
import { resolveConfig } from "./resolveConfig";
import { DEMO_REPO } from "../demo/tinyRepo";
import type { GithubError } from "../github/githubClient";

const ok = (text: string) =>
  Promise.resolve({ ok: true as const, value: text });

const fail = (kind: GithubError["kind"] = "not_found") =>
  Promise.resolve({
    ok: false as const,
    error: { kind, message: "nope" },
  });

describe("resolveConfig — happy paths", () => {
  it("resolves a file item by line range", async () => {
    const fetcher = vi.fn().mockReturnValue(ok("line1\nline2\nline3\nline4"));
    const r = await resolveConfig(
      {
        version: 1,
        repo: "a/b",
        title: "t",
        items: [
          {
            level: "file",
            path: "x.ts",
            label: "x",
            startLine: 2,
            endLine: 3,
          },
        ],
      },
      fetcher,
    );
    expect(r.items).toHaveLength(1);
    expect(r.items[0].text).toBe("line2\nline3");
    expect(r.errors).toEqual([]);
  });

  it("resolves a function by symbol via regex extractor", async () => {
    const code = `function alpha() {\n  return 1;\n}\n\nfunction beta() {\n  return 2;\n}\n`;
    const fetcher = vi.fn().mockReturnValue(ok(code));
    const r = await resolveConfig(
      {
        version: 1,
        repo: "a/b",
        title: "t",
        items: [
          {
            level: "function",
            path: "x.ts",
            symbol: "beta",
            label: "beta",
          },
        ],
      },
      fetcher,
    );
    expect(r.errors).toEqual([]);
    expect(r.items[0].text).toContain("function beta");
    expect(r.items[0].startLine).toBe(5);
  });

  it("uses the demo repo without calling the fetcher", async () => {
    const fetcher = vi.fn();
    const r = await resolveConfig(
      {
        version: 1,
        repo: DEMO_REPO,
        title: "demo",
        items: [
          {
            level: "function",
            path: "src/scheduler.ts",
            symbol: "Scheduler",
            label: "Scheduler",
          },
        ],
      },
      fetcher,
    );
    expect(fetcher).not.toHaveBeenCalled();
    expect(r.items).toHaveLength(1);
    expect(r.items[0].text).toContain("class Scheduler");
  });

  it("uses defaultRef when config.ref is undefined", async () => {
    const fetcher = vi
      .fn()
      .mockImplementation((_o, _r, ref) => ok(`ref-was-${ref}`));
    const r = await resolveConfig(
      {
        version: 1,
        repo: "a/b",
        title: "t",
        items: [{ level: "file", path: "x.ts", label: "x" }],
      },
      fetcher,
      { defaultRef: "trunk" },
    );
    expect(r.ref).toBe("trunk");
    expect(r.items[0].text).toContain("trunk");
  });
});

describe("resolveConfig — error handling", () => {
  it("collects fetch_failed for not_found path", async () => {
    const r = await resolveConfig(
      {
        version: 1,
        repo: "a/b",
        title: "t",
        items: [{ level: "file", path: "missing.ts", label: "x" }],
      },
      () => fail("not_found"),
    );
    expect(r.items).toEqual([]);
    expect(r.errors[0].kind).toBe("fetch_failed");
    expect(r.errors[0].message).toMatch(/Could not find missing\.ts/);
  });

  it("rate_limit / network errors produce 'Could not load' message", async () => {
    const rate = await resolveConfig(
      {
        version: 1,
        repo: "a/b",
        title: "t",
        items: [{ level: "file", path: "x.ts", label: "x" }],
      },
      () => fail("rate_limit"),
    );
    expect(rate.errors[0].kind).toBe("fetch_failed");
    expect(rate.errors[0].message).toMatch(/Could not load x\.ts/);
    expect(rate.errors[0].detail?.kind).toBe("rate_limit");

    const net = await resolveConfig(
      {
        version: 1,
        repo: "a/b",
        title: "t",
        items: [{ level: "file", path: "x.ts", label: "x" }],
      },
      () => fail("network"),
    );
    expect(net.errors[0].detail?.kind).toBe("network");
  });

  it("populates language on resolved items via file extension", async () => {
    const fetcher = vi.fn().mockReturnValue(ok("def alpha(): pass\n"));
    const r = await resolveConfig(
      {
        version: 1,
        repo: "a/b",
        title: "t",
        items: [{ level: "file", path: "x.py", label: "x" }],
      },
      fetcher,
    );
    expect(r.items[0].language).toBe("Python");
  });

  it("collects symbol_missing when extractor finds nothing", async () => {
    const fetcher = vi.fn().mockReturnValue(ok("function alpha() {}\n"));
    const r = await resolveConfig(
      {
        version: 1,
        repo: "a/b",
        title: "t",
        items: [
          {
            level: "function",
            path: "x.ts",
            symbol: "ghost",
            label: "ghost",
          },
        ],
      },
      fetcher,
    );
    expect(r.errors[0].kind).toBe("symbol_missing");
  });

  it("collects empty_snippet for whitespace-only ranges", async () => {
    const fetcher = vi.fn().mockReturnValue(ok("a\n\n\nb"));
    const r = await resolveConfig(
      {
        version: 1,
        repo: "a/b",
        title: "t",
        items: [
          {
            level: "file",
            path: "x.ts",
            label: "x",
            startLine: 2,
            endLine: 3,
          },
        ],
      },
      fetcher,
    );
    expect(r.errors[0].kind).toBe("empty_snippet");
  });

  it("clips a file item without explicit range to a tidbit window", async () => {
    // 50-line file: 3 imports + blank + 46 real lines.
    const lines = [
      `import { x } from "./a";`,
      `import { y } from "./b";`,
      `import { z } from "./c";`,
      ``,
      ...Array.from({ length: 46 }, (_, i) => `const line${i + 1} = ${i + 1};`),
    ];
    const code = lines.join("\n");
    const r = await resolveConfig(
      {
        version: 1,
        repo: "a/b",
        title: "t",
        items: [{ level: "file", path: "x.ts", label: "x" }],
      },
      () => Promise.resolve({ ok: true as const, value: code }),
    );
    expect(r.errors).toEqual([]);
    const item = r.items[0];
    // Window skipped 3 imports + 1 blank (4 lines), so startLine = 5.
    expect(item.startLine).toBe(5);
    // And clipped to MAX_LINES_PER_ITEM = 30 lines.
    expect(item.text.split("\n").length).toBeLessThanOrEqual(30);
    expect(item.endLine).toBe(item.startLine! + item.text.split("\n").length - 1);
    expect(item.text.startsWith("const line1 ")).toBe(true);
  });

  it("clips an explicit line range that exceeds the cap", async () => {
    const code = Array.from({ length: 100 }, (_, i) => `line${i + 1}`).join("\n");
    const r = await resolveConfig(
      {
        version: 1,
        repo: "a/b",
        title: "t",
        items: [
          {
            level: "file",
            path: "x.ts",
            label: "x",
            startLine: 1,
            endLine: 80,
          },
        ],
      },
      () => Promise.resolve({ ok: true as const, value: code }),
    );
    expect(r.errors).toEqual([]);
    expect(r.items[0].text.split("\n").length).toBeLessThanOrEqual(30);
    expect(r.items[0].endLine).toBe(30);
  });

  it("continues past errors and resolves later items", async () => {
    const fetcher = vi
      .fn()
      .mockImplementationOnce(() => fail("not_found"))
      .mockImplementationOnce(() => ok("ok-content\n"));
    const r = await resolveConfig(
      {
        version: 1,
        repo: "a/b",
        title: "t",
        items: [
          { level: "file", path: "missing.ts", label: "1" },
          { level: "file", path: "ok.ts", label: "2" },
        ],
      },
      fetcher,
    );
    expect(r.errors).toHaveLength(1);
    expect(r.items).toHaveLength(1);
    expect(r.items[0].label).toBe("2");
  });
});
