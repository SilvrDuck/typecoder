import { describe, it, expect } from "vitest";
import {
  encodeSession,
  decodeSession,
  base64UrlEncode,
  base64UrlDecode,
  type EncodedSession,
} from "./urlState";

describe("urlState", () => {
  it("round-trips a curated session", () => {
    const s: EncodedSession = {
      kind: "curated",
      id: "linux",
      cursor: 2,
      results: [
        { wpm: 42, acc: 0.93, ms: 15000, chars: 120, mistakes: 3, label: "x", path: "init/main.c" },
      ],
    };
    const out = decodeSession(encodeSession(s));
    expect(out).toEqual(s);
  });

  it("round-trips an inline config session", () => {
    const s: EncodedSession = {
      kind: "config",
      source: "demo",
      config: {
        version: 1,
        repo: "demo/tiny-codebase",
        title: "Demo",
        items: [
          { level: "file", path: "src/a.ts", label: "a", startLine: 1, endLine: 5 },
        ],
      },
      cursor: 0,
      results: [],
    };
    const out = decodeSession(encodeSession(s));
    expect(out).toEqual(s);
  });

  it("decodeSession returns null for garbage", () => {
    expect(decodeSession("not_base64!!!")).toBeNull();
    expect(decodeSession(base64UrlEncode("not json"))).toBeNull();
    expect(decodeSession(base64UrlEncode('{"kind":"unknown"}'))).toBeNull();
    expect(decodeSession("")).toBeNull();
  });

  it("decodeSession rejects a kind:config with a schema-invalid config", () => {
    // Missing required fields (no items, no repo).
    const bad = base64UrlEncode(
      JSON.stringify({ kind: "config", source: "x", config: { hax: true } }),
    );
    expect(decodeSession(bad)).toBeNull();
  });

  it("decodeSession rejects a kind:config without a source", () => {
    const bad = base64UrlEncode(
      JSON.stringify({
        kind: "config",
        config: {
          version: 1,
          repo: "demo/tiny-codebase",
          title: "x",
          items: [{ level: "file", path: "a.ts", label: "x" }],
        },
      }),
    );
    expect(decodeSession(bad)).toBeNull();
  });

  it("decodeSession rejects a kind:curated without a string id", () => {
    const bad = base64UrlEncode(JSON.stringify({ kind: "curated" }));
    expect(decodeSession(bad)).toBeNull();
  });

  it("base64url uses URL-safe alphabet (no +/= padding)", () => {
    const enc = base64UrlEncode("ÿþý"); // forces +/ in plain b64
    expect(enc).not.toMatch(/[+/=]/);
    expect(base64UrlDecode(enc)).toBe("ÿþý");
  });

  it("base64url handles UTF-8 (non-ASCII content) round-trip", () => {
    const s = "Héllo • monkë";
    expect(base64UrlDecode(base64UrlEncode(s))).toBe(s);
  });
});
