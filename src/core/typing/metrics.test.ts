import { describe, it, expect } from "vitest";
import { startTyping, applyKey } from "./typingEngine";
import { calculateMetrics } from "./metrics";

describe("metrics", () => {
  it("returns zero metrics for fresh state", () => {
    const m = calculateMetrics(startTyping("hi"), 0);
    expect(m.rawWpm).toBe(0);
    expect(m.codeWpm).toBe(0);
    expect(m.accuracy).toBe(1);
    expect(m.charsTyped).toBe(0);
    expect(m.progress).toBe(0);
  });

  it("computes progress proportional to correct chars", () => {
    let s = startTyping("hello");
    s = applyKey(s, "h", { now: 1000 });
    s = applyKey(s, "e", { now: 1500 });
    const m = calculateMetrics(s, 2000);
    expect(m.progress).toBeCloseTo(0.4, 5);
  });

  it("accuracy counts corrected mistakes against denominator", () => {
    let s = startTyping("hi");
    s = applyKey(s, "h", { now: 1000 });
    s = applyKey(s, "o", { now: 1100 });
    s = applyKey(s, "Backspace", { now: 1200 });
    s = applyKey(s, "i", { now: 1300 });
    const m = calculateMetrics(s, 1300);
    // 3 keystrokes typed (h, o, i), 2 correct, 1 wrong corrected
    expect(m.charsTyped).toBe(3);
    expect(m.accuracy).toBeCloseTo(2 / 3, 5);
    expect(m.correctedMistakes).toBe(1);
    expect(m.uncorrectedMistakes).toBe(0);
  });

  it("computes wpm using 5-char word convention", () => {
    // startedAt is captured on the first keystroke, so 5 keystrokes at
    // 600ms intervals = 4 intervals = 2400ms elapsed.
    // 5 chars = 1 word, 2.4s = 0.04 min, wpm = 1 / 0.04 = 25.
    let s = startTyping("aaaaa");
    let now = 1000;
    for (const ch of "aaaaa") {
      now += 600;
      s = applyKey(s, ch, { now });
    }
    const m = calculateMetrics(s, now);
    expect(m.codeWpm).toBe(25);
    expect(m.rawWpm).toBe(25);
  });

  it("does not inflate WPM when Tab consumes target indentation", () => {
    // The user pressed Tab + x. Tab auto-consumed 4 spaces (freeChars).
    // charsTyped reflects manually-produced characters, so the 4 indent
    // chars do NOT count. Only the 'x' (and the Enter/Tab themselves, which
    // produce zero "manual" characters) count toward charsTyped.
    let s = startTyping("    x");
    s = applyKey(s, "Tab", { now: 1000 });
    s = applyKey(s, "x", { now: 2200 });
    const m = calculateMetrics(s, 2200);
    expect(s.freeChars).toBe(4);
    expect(m.charsTyped).toBe(1); // only 'x' is a user-produced character
  });

  it("counts manually typed indentation toward WPM (no Tab shortcut)", () => {
    // Same target as previous test, but the user types each space manually.
    // freeChars should be 0 and charsTyped should reflect the full 5 chars.
    let s = startTyping("    x");
    let now = 1000;
    for (const ch of "    x") {
      s = applyKey(s, ch, { now: ++now });
    }
    const m = calculateMetrics(s, now);
    expect(s.freeChars).toBe(0);
    expect(m.charsTyped).toBe(5);
  });

  it("does not inflate WPM when Enter auto-skips indentation", () => {
    let s = startTyping("a\n  b");
    s = applyKey(s, "a", { now: 1000 });
    s = applyKey(s, "Enter", { now: 2000 });
    s = applyKey(s, "b", { now: 3000 });
    const m = calculateMetrics(s, 3000);
    // The Enter keystroke produces the "\n" (still a user-typed char,
    // 1:1 with the keypress). Only the two auto-indent spaces are free.
    expect(s.freeChars).toBe(2);
    // Manual chars: 'a' + '\n' + 'b' = 3.
    expect(m.charsTyped).toBe(3);
  });

  it("does not over-count corrections when user backspaces past a correct char", () => {
    let s = startTyping("abc");
    s = applyKey(s, "a", { now: 1000 });
    s = applyKey(s, "b", { now: 1100 });
    s = applyKey(s, "Backspace", { now: 1200 }); // over-deletes correct 'b'
    s = applyKey(s, "b", { now: 1300 });
    s = applyKey(s, "c", { now: 1400 });
    const m = calculateMetrics(s, 1400);
    // The backspace over a correct 'b' should NOT count as a correction.
    expect(m.correctedMistakes).toBe(0);
  });

  it("smart-space skip penalizes accuracy but not WPM", () => {
    // target "foo bar"; user types 'f' then smart-skips "oo" with SPACE,
    // then types "bar" correctly. 2 chars are missed, 5 are real
    // keystrokes (f, space, b, a, r). Accuracy denominator includes the
    // missed chars so a skipped word costs accuracy.
    let s = startTyping("foo bar");
    s = applyKey(s, "f", { now: 1000 });
    s = applyKey(s, " ", { now: 1000 });
    for (const ch of "bar") {
      s = applyKey(s, ch, { now: 1000 });
    }
    const m = calculateMetrics(s, 2000);
    expect(s.missedIndices.size).toBe(2);
    expect(s.freeChars).toBe(2);
    // 5 user keystrokes: f, space, b, a, r
    expect(m.charsTyped).toBe(5);
    // 5 correct, 0 wrong, 2 missed. Accuracy = 5/(5+2).
    expect(m.accuracy).toBeCloseTo(5 / 7, 5);
  });

  it("backspace over smart-skip restores freeChars exactly", () => {
    // Backspacing over the boundary space (real keystroke) must NOT
    // decrement freeChars; only backspacing over missed-filler positions does.
    let s = startTyping("foo bar");
    s = applyKey(s, "f", { now: 1000 }); // enter "foo"
    s = applyKey(s, " ", { now: 1000 }); // smart-skip → freeChars=2
    expect(s.freeChars).toBe(2);
    s = applyKey(s, "Backspace", { now: 1100 }); // removes the boundary space
    expect(s.freeChars).toBe(2); // unchanged — space was a real keystroke
    s = applyKey(s, "Backspace", { now: 1200 }); // removes missed 'o' at idx 2
    expect(s.freeChars).toBe(1);
  });

  it("counts boundary extras as keystrokes and uncorrected mistakes", () => {
    // target 'a b': type 'a' (correct), then 5 wrong chars at boundary.
    let s = startTyping("a b");
    s = applyKey(s, "a", { now: 1000 });
    for (const ch of "xxxxx") s = applyKey(s, ch, { now: 1100 });
    const m = calculateMetrics(s, 1200);
    // 6 user keystrokes: 'a' + 5 extras
    expect(m.charsTyped).toBe(6);
    // 1 correct ('a'), 5 wrong-extras: accuracy = 1/6
    expect(m.accuracy).toBeCloseTo(1 / 6, 5);
    // The 5 extras are uncorrected mistakes.
    expect(m.uncorrectedMistakes).toBe(5);
  });

  it("backspacing a boundary extra counts as a corrected mistake", () => {
    let s = startTyping("a b");
    s = applyKey(s, "a", { now: 1000 });
    s = applyKey(s, "x", { now: 1100 }); // boundary extra
    s = applyKey(s, "Backspace", { now: 1200 }); // pop it
    const m = calculateMetrics(s, 1300);
    expect(m.correctedMistakes).toBe(1);
    expect(m.uncorrectedMistakes).toBe(0);
  });

  it("freezes elapsedMs at completion", () => {
    let s = startTyping("hi");
    s = applyKey(s, "h", { now: 1000 });
    s = applyKey(s, "i", { now: 1500 });
    const a = calculateMetrics(s, 9999);
    expect(a.elapsedMs).toBe(500); // 1500 - 1000
  });
});
