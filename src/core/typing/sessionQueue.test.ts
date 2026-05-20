import { describe, it, expect } from "vitest";
import {
  nextItem,
  advance,
  isSessionComplete,
  restartItem,
  type Session,
  type SessionItem,
  type SessionResult,
} from "./sessionQueue";
import { startTyping } from "./typingEngine";

function makeSession(items: SessionItem[]): Session {
  return {
    id: "s1",
    title: "Test",
    items,
    cursor: 0,
    results: [],
  };
}

const a: SessionItem = { id: "a", label: "A", text: "a" };
const b: SessionItem = { id: "b", label: "B", text: "b" };
const c: SessionItem = { id: "c", label: "C", text: "c" };

const resultFor = (id: string): SessionResult => ({
  itemId: id,
  state: startTyping("x"),
});

describe("sessionQueue", () => {
  it("nextItem returns the first item", () => {
    expect(nextItem(makeSession([a, b]))?.id).toBe("a");
  });

  it("nextItem returns undefined when cursor is past end", () => {
    const s: Session = { ...makeSession([a]), cursor: 1 };
    expect(nextItem(s)).toBeUndefined();
  });

  it("advance pushes a result and increments cursor", () => {
    const s = advance(makeSession([a, b]), resultFor("a"));
    expect(s.cursor).toBe(1);
    expect(s.results).toHaveLength(1);
    expect(s.results[0].itemId).toBe("a");
  });

  it("advance does not push cursor past the end", () => {
    let s = makeSession([a]);
    s = advance(s, resultFor("a"));
    s = advance(s, resultFor("a"));
    expect(s.cursor).toBe(1);
    expect(s.results).toHaveLength(2);
  });

  it("isSessionComplete is false until cursor reaches end", () => {
    let s = makeSession([a, b, c]);
    expect(isSessionComplete(s)).toBe(false);
    s = advance(s, resultFor("a"));
    s = advance(s, resultFor("b"));
    expect(isSessionComplete(s)).toBe(false);
    s = advance(s, resultFor("c"));
    expect(isSessionComplete(s)).toBe(true);
  });

  it("restartItem leaves the queue unchanged", () => {
    const s = makeSession([a, b]);
    expect(restartItem(s)).toEqual(s);
  });
});
