import { describe, it, expect } from "vitest";
import { extractSymbolsSync, findSymbol, extractByLineRange } from "./regexExtractors";

describe("regexExtractors — TypeScript/JavaScript", () => {
  it("finds named function declarations", () => {
    const src = `export function resolveConfig(opts: Opts) {\n  return 1;\n}\n`;
    const syms = extractSymbolsSync("x.ts", src);
    expect(syms.find((s) => s.symbol === "resolveConfig")).toBeTruthy();
  });

  it("finds arrow-function assignments", () => {
    const src = `export const handler = (req: Req) => {\n  return 1;\n};\n`;
    const syms = extractSymbolsSync("x.ts", src);
    expect(syms.find((s) => s.symbol === "handler")).toBeTruthy();
  });

  it("finds class declarations", () => {
    const src = `export class Scheduler {\n  enqueue() {}\n}\n`;
    const syms = extractSymbolsSync("x.ts", src);
    expect(syms.find((s) => s.symbol === "Scheduler" && s.level === "class"))
      .toBeTruthy();
  });

  it("computes endLine to next top-level symbol", () => {
    const src = `function a() {\n  return 1;\n}\nfunction b() {\n  return 2;\n}\n`;
    const syms = extractSymbolsSync("x.ts", src);
    const a = findSymbol(syms, "a");
    expect(a).toBeTruthy();
    expect(a!.endLine).toBe(3);
  });

  it("ignores commented-out function lines", () => {
    const src = `// function notAFunction() {}\nfunction realOne() {}\n`;
    const syms = extractSymbolsSync("x.ts", src);
    expect(syms.find((s) => s.symbol === "notAFunction")).toBeFalsy();
    expect(syms.find((s) => s.symbol === "realOne")).toBeTruthy();
  });

  it("does not match if/while/catch as method-ish functions", () => {
    const src = `class Foo {\n  method() {\n    if (cond) {\n      return;\n    }\n    while (x) {}\n  }\n}\n`;
    const syms = extractSymbolsSync("x.ts", src);
    expect(syms.find((s) => s.symbol === "if")).toBeUndefined();
    expect(syms.find((s) => s.symbol === "while")).toBeUndefined();
    expect(syms.find((s) => s.symbol === "method")?.level).toBe("function");
  });
});

describe("regexExtractors — Python", () => {
  it("finds def and async def", () => {
    const src = `def alpha():\n    pass\n\nasync def beta():\n    pass\n`;
    const syms = extractSymbolsSync("x.py", src);
    expect(findSymbol(syms, "alpha")).toBeTruthy();
    expect(findSymbol(syms, "beta")).toBeTruthy();
  });

  it("finds class definitions", () => {
    const src = `class Parser:\n    pass\n`;
    const syms = extractSymbolsSync("x.py", src);
    expect(syms[0].level).toBe("class");
  });
});

describe("regexExtractors — Go / Rust / C", () => {
  it("finds Go funcs and structs", () => {
    const src = `func DoThing() int { return 0 }\ntype Cache struct { x int }\n`;
    const syms = extractSymbolsSync("x.go", src);
    expect(findSymbol(syms, "DoThing")?.level).toBe("function");
    expect(findSymbol(syms, "Cache")?.level).toBe("class");
  });

  it("finds Rust fn, struct, enum, impl", () => {
    const src = `pub fn run() -> i32 { 0 }\npub struct Buf { x: u32 }\npub enum Kind { A, B }\nimpl<T> Buf {}\n`;
    const syms = extractSymbolsSync("x.rs", src);
    expect(findSymbol(syms, "run")?.level).toBe("function");
    expect(findSymbol(syms, "Buf")).toBeTruthy();
    expect(findSymbol(syms, "Kind")).toBeTruthy();
  });

  it("finds C functions and structs", () => {
    const src = `int add(int a, int b) {\n  return a + b;\n}\nstruct point { int x; int y; };\n`;
    const syms = extractSymbolsSync("x.c", src);
    expect(findSymbol(syms, "add")?.level).toBe("function");
  });

  it("finds C multi-line function signatures (kernel style)", () => {
    const src = `__latent_entropy struct task_struct *copy_process(\n    struct pid *pid,\n    int trace)\n{\n    return NULL;\n}\n`;
    const syms = extractSymbolsSync("x.c", src);
    expect(findSymbol(syms, "copy_process")?.level).toBe("function");
  });

  it("finds C function decl/def without trailing brace on same line", () => {
    const src = `void free_pages(unsigned long addr, unsigned int order)\n{\n    return;\n}\n`;
    const syms = extractSymbolsSync("x.c", src);
    expect(findSymbol(syms, "free_pages")?.level).toBe("function");
  });

  it("ignores all-caps macro invocations at column 0", () => {
    const src = `EXPORT_SYMBOL(start_kernel);\nMODULE_LICENSE("GPL");\nvoid actual_fn(void)\n{\n    return;\n}\n`;
    const syms = extractSymbolsSync("x.c", src);
    expect(findSymbol(syms, "EXPORT_SYMBOL")).toBeUndefined();
    expect(findSymbol(syms, "MODULE_LICENSE")).toBeUndefined();
    expect(findSymbol(syms, "actual_fn")).toBeTruthy();
  });
});

describe("regexExtractors — Java", () => {
  it("requires an access modifier to match a method", () => {
    const src = `class Foo {\n  public int add(int a, int b) {\n    return a + b;\n  }\n  someCall(x);\n}\n`;
    const syms = extractSymbolsSync("x.java", src);
    expect(syms.find((s) => s.symbol === "add")?.level).toBe("function");
    expect(syms.find((s) => s.symbol === "someCall")).toBeUndefined();
  });

  it("finds Kotlin fun definitions", () => {
    const src = `class Foo {\n  fun greet(name: String) {\n    return\n  }\n}\n`;
    const syms = extractSymbolsSync("x.kt", src);
    expect(syms.find((s) => s.symbol === "greet")?.level).toBe("function");
  });
});

describe("regexExtractors — robustness", () => {
  it("returns empty for unsupported extensions", () => {
    expect(extractSymbolsSync("x.md", "# heading")).toEqual([]);
  });

  it("never throws on malformed input", () => {
    expect(() => extractSymbolsSync("x.ts", "((((((((((")).not.toThrow();
    expect(() => extractSymbolsSync("x.py", "def\ndef\ndef")).not.toThrow();
  });
});

describe("extractByLineRange", () => {
  it("extracts inclusive line range, 1-indexed", () => {
    expect(extractByLineRange("a\nb\nc\nd", 2, 3)).toBe("b\nc");
  });

  it("clamps out-of-range end", () => {
    expect(extractByLineRange("a\nb", 1, 99)).toBe("a\nb");
  });
});
