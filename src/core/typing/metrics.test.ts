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

  it("freezes elapsedMs at completion", () => {
    let s = startTyping("hi");
    s = applyKey(s, "h", { now: 1000 });
    s = applyKey(s, "i", { now: 1500 });
    const a = calculateMetrics(s, 9999);
    expect(a.elapsedMs).toBe(500); // 1500 - 1000
  });
});
