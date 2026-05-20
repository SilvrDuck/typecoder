import { describe, it, expect } from "vitest";
import { startTyping, applyKey, type TypingState } from "./typingEngine";
import { summarizeWeakSpots, buildWeakSpotPracticeQueue } from "./weakSpots";

function play(target: string, sequence: Array<string>): TypingState {
  let s = startTyping(target);
  let now = 1000;
  for (const k of sequence) {
    s = applyKey(s, k, { now: ++now });
  }
  return s;
}

describe("summarizeWeakSpots", () => {
  it("ranks hardest characters by mistake count", () => {
    const r1 = {
      target: "abc",
      state: play("abc", ["a", "x", "x", "c"]), // two wrongs at b
      label: "snip1",
    };
    const r2 = {
      target: "def",
      state: play("def", ["d", "x", "f"]), // one wrong at e
      label: "snip2",
    };
    const out = summarizeWeakSpots([r1, r2]);
    expect(out.hardestChars[0].char).toBe("b");
    expect(out.hardestChars.find((c) => c.char === "b")?.count).toBeGreaterThanOrEqual(
      out.hardestChars.find((c) => c.char === "e")?.count ?? 0,
    );
  });

  it("collapses whitespace mistakes into labelled buckets", () => {
    const r = {
      target: " ",
      state: play(" ", ["x"]),
      label: "snip",
    };
    const out = summarizeWeakSpots([r]);
    expect(out.hardestChars[0].char).toBe("space");
  });

  it("attributes extras past end-of-target to the last line, not a phantom line", () => {
    // target ends without trailing newline at line 2
    const target = "a\nbc";
    let state = play(target, ["a", "Enter", "b", "c"]);
    // simulate one extra char past end of target
    state = play(target, ["a", "Enter", "b", "c", "x"]);
    const out = summarizeWeakSpots([{ target, state, label: "snip" }]);
    // The extra mistake must land on line 2, not line 3
    expect(out.hardestLines.every((l) => l.line <= 2)).toBe(true);
  });

  it("preserves source paths that contain colons (windows-style)", () => {
    const target = "ab";
    const state = play(target, ["a", "x"]);
    const out = summarizeWeakSpots([
      {
        target,
        state,
        label: "snip",
        path: "C:/repos/foo/bar.ts",
      },
    ]);
    expect(out.hardestLines[0].preview).toContain("C:/repos/foo/bar.ts");
  });

  it("locates mistakes on the right line", () => {
    const target = "a\nbc";
    const r = {
      target,
      state: play(target, ["a", "Enter", "x", "c"]),
      label: "snip",
      path: "x.ts",
    };
    const out = summarizeWeakSpots([r]);
    expect(out.hardestLines[0].line).toBe(2);
  });
});

describe("buildWeakSpotPracticeQueue", () => {
  it("returns the hardest lines as practice items", () => {
    const target = "good line\nbad  line";
    const r = {
      target,
      state: play(target, [
        ...target.split("").slice(0, 10), // type first line ~ correct
        "x", // wrong on line 2
        "x", // another wrong on line 2
      ]),
      label: "snip",
      path: "x.ts",
    };
    const queue = buildWeakSpotPracticeQueue([r]);
    expect(queue.length).toBeGreaterThanOrEqual(1);
    expect(queue[0].text).toContain("bad");
  });

  it("returns empty queue when there are no mistakes", () => {
    const target = "abc";
    const r = {
      target,
      state: play(target, ["a", "b", "c"]),
      label: "snip",
    };
    expect(buildWeakSpotPracticeQueue([r])).toEqual([]);
  });
});
