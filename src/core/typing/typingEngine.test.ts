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

  it("marks smart-space skipped positions as 'missed'", () => {
    let s = startTyping("ab cd");
    s = applyKey(s, "a"); // type 'a' to enter the word
    s = applyKey(s, " "); // smart-skip remainder of "ab", consume " "
    expect(charStatuses(s)).toEqual([
      "correct",
      "missed",
      "correct",
      "pending",
      "pending",
    ]);
  });

  it("does not skip when space pressed at start of an untouched word", () => {
    let s = startTyping("foo bar");
    s = applyKey(s, " "); // Monkeytype rule 1.1 — no-op at empty word
    expect(s.cursor).toBe(0);
    expect(s.input).toBe("");
    expect(s.mistakes.length).toBe(0);
  });

  it("attaches space as a boundary extra when target wants a newline", () => {
    let s = startTyping("foo\nbar");
    for (const ch of "foo") s = applyKey(s, ch);
    expect(s.cursor).toBe(3);
    s = applyKey(s, " "); // target[3] === '\n' → boundary extra, not consumed
    expect(s.cursor).toBe(3);
    expect(s.input).toBe("foo");
    expect(s.extras.get(3)).toBe(" ");
  });

  it("attaches space as a boundary extra when target wants a tab", () => {
    let s = startTyping("a\tb");
    s = applyKey(s, "a");
    s = applyKey(s, " "); // target[1] === '\t' → boundary extra
    expect(s.cursor).toBe(1);
    expect(s.input).toBe("a");
    expect(s.extras.get(1)).toBe(" ");
  });
});

describe("typingEngine — smart Tab/Enter", () => {
  it("Tab is a no-op when target at cursor is a newline", () => {
    let s = startTyping("\nfoo");
    s = applyKey(s, "Tab"); // target[0] === '\n' → no consume
    expect(s.cursor).toBe(0);
    expect(s.input).toBe("");
    expect(s.freeChars).toBe(0);
  });
});

describe("typingEngine — smart space", () => {
  it("inserts literal space when target wants one", () => {
    let s = startTyping("a b");
    s = applyKey(s, "a", { now: 1 });
    s = applyKey(s, " ", { now: 2 });
    expect(s.input).toBe("a ");
    expect(s.cursor).toBe(2);
    expect(s.missedIndices.size).toBe(0);
    expect(s.mistakes.length).toBe(0);
  });

  it("skips to next space when target is mid-token", () => {
    let s = startTyping("foo bar");
    s = applyKey(s, "f", { now: 1 }); // enter word "foo"
    s = applyKey(s, " ", { now: 2 }); // smart-skip remainder of "foo"
    // positions 1,2 ('o','o') marked missed; space at 3 consumed; cursor=4
    expect(s.cursor).toBe(4);
    expect(s.input).toBe("foo ");
    expect(s.missedIndices.has(0)).toBe(false); // 'f' was correctly typed
    expect(s.missedIndices.has(1)).toBe(true);
    expect(s.missedIndices.has(2)).toBe(true);
    expect(s.missedIndices.has(3)).toBe(false);
    expect(s.mistakes.filter((m) => m.actual === "").length).toBe(2);
    expect(s.freeChars).toBe(2);
  });

  it("stops at newline boundary without consuming it", () => {
    let s = startTyping("foo\nbar");
    s = applyKey(s, "f", { now: 1 });
    s = applyKey(s, " ", { now: 2 });
    expect(s.cursor).toBe(3); // stopped AT the newline
    expect(s.input).toBe("foo");
    expect(s.missedIndices.size).toBe(2); // 'o','o' missed
  });

  it("skips to end of target when no boundary remains", () => {
    let s = startTyping("foo");
    s = applyKey(s, "f", { now: 1 });
    s = applyKey(s, " ", { now: 2 });
    expect(s.cursor).toBe(3);
    expect(s.input).toBe("foo");
    expect(isComplete(s)).toBe(true);
    expect(s.missedIndices.size).toBe(2);
  });

  it("backspace clears missed flags so retyping scores normally", () => {
    let s = startTyping("foo bar");
    s = applyKey(s, "f", { now: 1 });
    s = applyKey(s, " ", { now: 2 }); // smart-skip; missed at 1,2; cursor=4
    expect(s.freeChars).toBe(2); // 2 missed are free; boundary space isn't
    s = applyKey(s, "Backspace", { now: 3 }); // remove the ' ' at index 3
    expect(s.cursor).toBe(3);
    expect(s.freeChars).toBe(2); // still 2 — boundary space wasn't free
    expect(s.missedIndices.has(1)).toBe(true);
    expect(s.missedIndices.has(3)).toBe(false);
    s = applyKey(s, "Backspace", { now: 4 });
    s = applyKey(s, "Backspace", { now: 5 });
    s = applyKey(s, "Backspace", { now: 6 });
    expect(s.cursor).toBe(0);
    expect(s.missedIndices.size).toBe(0);
    expect(s.freeChars).toBe(0);
    expect(s.input).toBe("");
  });

  it("handles two consecutive smart-skips on a multi-word line", () => {
    let s = startTyping("foo bar baz");
    s = applyKey(s, "f", { now: 1 }); // enter "foo"
    s = applyKey(s, " ", { now: 2 }); // skip "oo", consume space; cursor=4
    expect(s.cursor).toBe(4);
    expect(s.missedIndices.size).toBe(2);
    s = applyKey(s, "b", { now: 3 }); // enter "bar"
    s = applyKey(s, " ", { now: 4 }); // skip "ar", consume space; cursor=8
    expect(s.cursor).toBe(8);
    expect(s.missedIndices.size).toBe(4);
    for (const idx of [1, 2, 5, 6]) {
      expect(s.missedIndices.has(idx)).toBe(true);
    }
    expect(s.missedIndices.has(0)).toBe(false); // 'f' typed correctly
    expect(s.missedIndices.has(3)).toBe(false); // boundary space
    expect(s.freeChars).toBe(4);
  });
});

describe("typingEngine — boundary extras", () => {
  it("typing past the end of a word does not consume the boundary space", () => {
    // target 'def void': typing 'abcde' wrongs 'abc' over 'def' (in-word
    // wrongs), then 'de' attaches as boundary extras at index 3 — the
    // structural space at index 3 is NOT consumed.
    let s = startTyping("def void");
    for (const ch of "abcde") s = applyKey(s, ch, { now: 1 });
    expect(s.input).toBe("abc"); // only the in-word wrongs landed in input
    expect(s.cursor).toBe(3); // cursor paused at the boundary space
    expect(s.extras.get(3)).toBe("de");
    expect(s.target[3]).toBe(" "); // boundary preserved
    expect(s.mistakes.length).toBe(3); // 3 in-word wrongs (a,b,c)
  });

  it("typing wrong chars past a word does not bleed across newline", () => {
    // target 'def foo:\n  bar': typing 10 wrong chars stays attached to
    // word 'def'; the newline and indent remain pending.
    let s = startTyping("def foo:\n  bar");
    for (const ch of "abcdefghij") s = applyKey(s, ch, { now: 1 });
    expect(s.input).toBe("abc");
    expect(s.cursor).toBe(3);
    expect(s.extras.get(3)).toBe("defghij");
    // \n at index 8 still pending — no shift.
    expect(s.target[8]).toBe("\n");
  });

  it("caps total extras (boundary + past-end) at MAX_EXTRAS", () => {
    let s = startTyping("a b");
    s = applyKey(s, "a", { now: 1 });
    // 25 wrong chars at the boundary; only 20 should land.
    for (let i = 0; i < 25; i++) s = applyKey(s, "x", { now: 1 });
    expect(s.extras.get(1)?.length).toBe(20);
  });

  it("Enter at a space/tab boundary attaches as a boundary extra", () => {
    let s = startTyping("a b");
    s = applyKey(s, "a", { now: 1 });
    s = applyKey(s, "Enter", { now: 1 });
    expect(s.cursor).toBe(1);
    expect(s.input).toBe("a");
    expect(s.extras.get(1)).toBe("\n");
  });

  it("backspace pops boundary extras before consuming input", () => {
    let s = startTyping("def void");
    for (const ch of "abcde") s = applyKey(s, ch, { now: 1 });
    expect(s.extras.get(3)).toBe("de");
    expect(s.correctedMistakes).toBe(0);
    s = applyKey(s, "Backspace", { now: 2 });
    expect(s.extras.get(3)).toBe("d");
    expect(s.correctedMistakes).toBe(1);
    s = applyKey(s, "Backspace", { now: 3 });
    expect(s.extras.has(3)).toBe(false);
    expect(s.correctedMistakes).toBe(2);
    // Next backspace falls through to the input.
    s = applyKey(s, "Backspace", { now: 4 });
    expect(s.input).toBe("ab");
    expect(s.cursor).toBe(2);
  });

  it("backspace at cursor=0 with extras at 0 pops the extras", () => {
    // target ' x': cursor=0, expected=' '. Type 'q' → boundary extra at 0.
    let s = startTyping(" x");
    s = applyKey(s, "q", { now: 1 });
    expect(s.cursor).toBe(0);
    expect(s.extras.get(0)).toBe("q");
    s = applyKey(s, "Backspace", { now: 2 });
    expect(s.extras.has(0)).toBe(false);
    expect(s.correctedMistakes).toBe(1);
  });

  it("ctrl-backspace clears all boundary extras at cursor in one shot", () => {
    let s = startTyping("a b");
    s = applyKey(s, "a", { now: 1 });
    for (const ch of "xyz") s = applyKey(s, ch, { now: 1 });
    expect(s.extras.get(1)).toBe("xyz");
    s = applyKey(s, "Backspace", { now: 2, ctrl: true });
    expect(s.extras.has(1)).toBe(false);
    expect(s.correctedMistakes).toBe(3);
  });

  it("alt-backspace also clears all boundary extras at cursor", () => {
    let s = startTyping("a b");
    s = applyKey(s, "a", { now: 1 });
    for (const ch of "xyz") s = applyKey(s, ch, { now: 1 });
    s = applyKey(s, "Backspace", { now: 2, alt: true });
    expect(s.extras.has(1)).toBe(false);
    expect(s.correctedMistakes).toBe(3);
  });

  it("ctrl-backspace at cursor=0 clears all extras at the leading boundary", () => {
    let s = startTyping(" x");
    for (const ch of "abc") s = applyKey(s, ch, { now: 1 });
    expect(s.extras.get(0)).toBe("abc");
    s = applyKey(s, "Backspace", { now: 2, ctrl: true });
    expect(s.extras.has(0)).toBe(false);
    expect(s.correctedMistakes).toBe(3);
    expect(s.cursor).toBe(0);
  });

  it("Space at a newline boundary attaches as boundary extra (does not consume \\n)", () => {
    let s = startTyping("foo\nbar");
    for (const ch of "foo") s = applyKey(s, ch, { now: 1 });
    expect(s.cursor).toBe(3);
    s = applyKey(s, " ", { now: 2 });
    expect(s.cursor).toBe(3);
    expect(s.input).toBe("foo");
    expect(s.extras.get(3)).toBe(" ");
    expect(s.target[3]).toBe("\n"); // newline still pending
  });
});
