import { describe, it, expect } from "vitest";
import {
  startTyping,
  applyKey,
  isComplete,
  resetTyping,
  charStatuses,
  type TypingState,
} from "./typingEngine";

function typeAll(target: string, chars: string, t0 = 1000): TypingState {
  let s = startTyping(target);
  let now = t0;
  for (const ch of chars) {
    s = applyKey(s, ch, { now: ++now });
  }
  return s;
}

describe("typingEngine — basics", () => {
  it("starts with empty input and cursor 0", () => {
    const s = startTyping("hi");
    expect(s.cursor).toBe(0);
    expect(s.input).toBe("");
    expect(isComplete(s)).toBe(false);
  });

  it("advances cursor and records startedAt on first char", () => {
    let s = startTyping("hi");
    s = applyKey(s, "h", { now: 1234 });
    expect(s.cursor).toBe(1);
    expect(s.input).toBe("h");
    expect(s.startedAt).toBe(1234);
    expect(s.mistakes).toEqual([]);
  });

  it("marks completion when last correct char is typed", () => {
    const s = typeAll("hi", "hi");
    expect(isComplete(s)).toBe(true);
    expect(s.completedAt).toBeDefined();
  });

  it("does not complete on partial match", () => {
    const s = typeAll("hello", "hell");
    expect(isComplete(s)).toBe(false);
  });

  it("does not complete when input differs from target", () => {
    const s = typeAll("hi", "ho");
    expect(isComplete(s)).toBe(false);
  });
});

describe("typingEngine — mistakes", () => {
  it("records a mistake when a wrong char is typed", () => {
    const s = typeAll("hi", "ho");
    expect(s.mistakes).toHaveLength(1);
    expect(s.mistakes[0]).toMatchObject({ index: 1, expected: "i", actual: "o" });
  });

  it("backspace decrements cursor and counts a corrected mistake", () => {
    let s = typeAll("hi", "ho");
    s = applyKey(s, "Backspace", { now: 9999 });
    expect(s.cursor).toBe(1);
    expect(s.input).toBe("h");
    expect(s.correctedMistakes).toBe(1);
    // After backspace through the wrong char, that mistake is dropped from
    // the live list — user can re-make it.
    expect(s.mistakes).toHaveLength(0);
  });

  it("backspace on empty input is a no-op", () => {
    let s = startTyping("hi");
    s = applyKey(s, "Backspace");
    expect(s.cursor).toBe(0);
    expect(s.correctedMistakes).toBe(0);
  });

  it("extra characters past end of target are marked as mistakes", () => {
    const s = typeAll("hi", "hix");
    const stats = charStatuses(s);
    expect(stats).toEqual(["correct", "correct", "extra"]);
    expect(s.mistakes).toHaveLength(1);
    expect(s.mistakes[0]).toMatchObject({ index: 2, actual: "x" });
  });

  it("does not auto-complete when extras are present", () => {
    const s = typeAll("hi", "hix");
    expect(isComplete(s)).toBe(false);
  });
});

describe("typingEngine — modifier backspaces", () => {
  it("ctrl+backspace deletes a word", () => {
    let s = typeAll("foo bar", "foo bar");
    s = applyKey(s, "Backspace", { ctrl: true });
    expect(s.input).toBe("foo ");
  });

  it("ctrl+backspace skips trailing whitespace then deletes prior word", () => {
    let s = typeAll("foo bar", "foo bar");
    s = applyKey(s, "Backspace", { ctrl: true });
    // first ctrl-bs deletes 'bar'
    s = applyKey(s, "Backspace", { ctrl: true });
    expect(s.input).toBe("foo");
  });

  it("alt+backspace deletes a token-ish chunk", () => {
    let s = typeAll("foo_bar", "foo_bar");
    s = applyKey(s, "Backspace", { alt: true });
    // identifier characters incl underscore are one token
    expect(s.input).toBe("");
  });

  it("alt+backspace on punctuation deletes one char", () => {
    let s = typeAll("foo.", "foo.");
    s = applyKey(s, "Backspace", { alt: true });
    expect(s.input).toBe("foo");
  });
});

describe("typingEngine — smart Enter", () => {
  it("Enter inserts newline and auto-advances past leading indent", () => {
    const target = "if (x) {\n  return 1;\n}";
    let s = startTyping(target);
    for (const ch of "if (x) {") s = applyKey(s, ch);
    s = applyKey(s, "Enter");
    // cursor should now be past "\n" AND past the two leading spaces
    expect(s.input).toBe("if (x) {\n  ");
    expect(s.cursor).toBe("if (x) {\n  ".length);
  });

  it("Enter not auto-skips if next line has no indent", () => {
    const target = "a\nb";
    let s = startTyping(target);
    s = applyKey(s, "a");
    s = applyKey(s, "Enter");
    expect(s.input).toBe("a\n");
  });

  it("Enter when target char is not newline records a mistake", () => {
    let s = startTyping("ab");
    s = applyKey(s, "a");
    s = applyKey(s, "Enter");
    expect(s.input).toBe("a\n");
    expect(s.mistakes).toHaveLength(1);
    expect(s.mistakes[0]).toMatchObject({ expected: "b", actual: "\n" });
  });
});

describe("typingEngine — smart Tab", () => {
  it("Tab consumes a run of whitespace from target", () => {
    const target = "    return 1;";
    let s = startTyping(target);
    s = applyKey(s, "Tab");
    expect(s.input).toBe("    ");
    expect(s.cursor).toBe(4);
  });

  it("Tab consumes a tab character if target has one", () => {
    const target = "\treturn 1;";
    let s = startTyping(target);
    s = applyKey(s, "Tab");
    expect(s.input).toBe("\t");
  });

  it("Tab on non-whitespace target is ignored (does not insert tab)", () => {
    const target = "hello";
    let s = startTyping(target);
    s = applyKey(s, "Tab");
    expect(s.input).toBe("");
    expect(s.cursor).toBe(0);
  });

  it("Tab stops at end of indent (not past newline)", () => {
    const target = "  \n  foo";
    let s = startTyping(target);
    s = applyKey(s, "Tab");
    expect(s.input).toBe("  ");
  });
});

describe("typingEngine — completion is sticky timestamp, not a hard lock", () => {
  it("completedAt is set when transitioning to complete", () => {
    let s = typeAll("hi", "hi");
    expect(s.completedAt).toBeDefined();
    expect(isComplete(s)).toBe(true);
  });

  it("typing past completion creates extras and isComplete becomes false", () => {
    let s = typeAll("hi", "hi");
    const completed = s.completedAt;
    s = applyKey(s, "x", { now: 9999 });
    expect(s.input).toBe("hix");
    expect(s.cursor).toBe(3);
    expect(isComplete(s)).toBe(false);
    // completedAt stays sticky so metrics can freeze elapsedMs
    expect(s.completedAt).toBe(completed);
  });
});

describe("typingEngine — reset", () => {
  it("resetTyping returns a fresh state", () => {
    const a = typeAll("hi", "hi");
    const b = resetTyping("hi");
    expect(b.cursor).toBe(0);
    expect(b.input).toBe("");
    expect(a).not.toBe(b);
  });
});

describe("charStatuses", () => {
  it("returns correct/wrong/pending per position", () => {
    let s = startTyping("abc");
    s = applyKey(s, "a");
    s = applyKey(s, "x");
    expect(charStatuses(s)).toEqual(["correct", "wrong", "pending"]);
  });
});
