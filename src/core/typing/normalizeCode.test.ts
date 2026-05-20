import { describe, it, expect } from "vitest";
import { normalizeCode } from "./normalizeCode";

describe("normalizeCode", () => {
  it("converts CRLF to LF", () => {
    expect(normalizeCode("a\r\nb\r\nc")).toBe("a\nb\nc");
  });

  it("strips BOM", () => {
    expect(normalizeCode("﻿foo")).toBe("foo");
  });

  it("strips trailing whitespace per line", () => {
    expect(normalizeCode("a   \nb")).toBe("a\nb");
  });

  it("strips trailing newlines", () => {
    expect(normalizeCode("foo\n\n\n")).toBe("foo");
  });

  it("preserves internal newlines and indentation", () => {
    expect(normalizeCode("if {\n  a\n}")).toBe("if {\n  a\n}");
  });
});
