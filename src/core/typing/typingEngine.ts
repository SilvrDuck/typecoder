/**
 * Pure typing engine.
 *
 * Cursor advances on every keystroke including wrong ones, mirroring
 * typing.io / Monkeytype-with-code. Wrong characters are recorded and stay
 * visible until the user backspaces over them, at which point they count
 * as a "corrected mistake".
 *
 * Completion: the user has typed exactly the target text and the last
 * keystroke landed the cursor at target.length.
 */

export type TypingMistake = {
  index: number;
  expected: string;
  actual: string;
  timestamp: number;
};

export type TypingState = {
  target: string;
  /** Characters typed so far. Invariant: `cursor === input.length`. */
  input: string;
  cursor: number;
  startedAt?: number;
  completedAt?: number;
  mistakes: TypingMistake[];
  correctedMistakes: number;
  /**
   * Characters auto-injected by smart Enter / smart Tab — they consume
   * target whitespace runs without the user pressing one key per char.
   * Subtracted from the WPM/accuracy denominator so a single Tab that
   * eats 4 spaces does not show up as 4 keystrokes worth of credit.
   */
  freeChars: number;
  /**
   * Indices the user skipped over by hitting SPACE mid-word (Monkeytype
   * "smart space"). The target chars at these positions are auto-filled
   * into `input` so the cursor invariant holds, but they are rendered as
   * "missed" and don't count as correct chars or as user keystrokes.
   */
  missedIndices: Set<number>;
};

export type KeyMeta = {
  ctrl?: boolean;
  meta?: boolean;
  alt?: boolean;
  shift?: boolean;
  now?: number;
};

export function startTyping(target: string): TypingState {
  return {
    target,
    input: "",
    cursor: 0,
    mistakes: [],
    correctedMistakes: 0,
    freeChars: 0,
    missedIndices: new Set<number>(),
  };
}

export function resetTyping(target: string): TypingState {
  return startTyping(target);
}

export function isComplete(state: TypingState): boolean {
  return (
    state.cursor === state.target.length &&
    state.input === state.target
  );
}

/**
 * Returns the per-position character status. Length is
 * `max(target.length, input.length)` so the UI can render "extra" cells
 * past the end of the target.
 */
export type CharStatus = "pending" | "correct" | "wrong" | "extra" | "missed";

export function charStatuses(state: TypingState): CharStatus[] {
  const out: CharStatus[] = [];
  const n = Math.max(state.target.length, state.input.length);
  for (let i = 0; i < n; i++) {
    if (state.missedIndices.has(i)) {
      out.push("missed");
    } else if (i >= state.target.length) {
      out.push(i < state.input.length ? "extra" : "pending");
    } else if (i >= state.input.length) {
      out.push("pending");
    } else if (state.input[i] === state.target[i]) {
      out.push("correct");
    } else {
      out.push("wrong");
    }
  }
  return out;
}

const TOKEN_RE = /[A-Za-z0-9_$]/;

/**
 * Apply a single keystroke. `key` is the human key value:
 *   - 1-char strings: append that character (or replace at cursor for wrong chars)
 *   - "Backspace": delete char before cursor
 *   - "Enter": insert "\n" and auto-skip leading indentation on the next line
 *   - "Tab": insert a run of consecutive whitespace from target starting at cursor
 *
 * Modifier-aware:
 *   - Ctrl/Meta + Backspace: delete back to previous non-word boundary
 *   - Alt + Backspace: delete back to previous token-ish boundary
 *
 * Returns a new state object (immutable).
 */
export function applyKey(
  state: TypingState,
  key: string,
  meta: KeyMeta = {},
): TypingState {
  const now = meta.now ?? Date.now();
  let s: TypingState = { ...state };

  // No completion lock here — that's a UI concern. The engine stays pure
  // so callers can compute "did we just transition to complete" and react.
  if (!s.startedAt && key.length === 1) s = { ...s, startedAt: now };
  if (!s.startedAt && (key === "Tab" || key === "Enter")) {
    s = { ...s, startedAt: now };
  }

  if (key === "Backspace") {
    if (s.cursor === 0) return s;
    const word = meta.ctrl || meta.meta;
    const token = meta.alt;
    let removeTo = s.cursor - 1;
    if (word) removeTo = findWordStart(s.input, s.cursor);
    else if (token) removeTo = findTokenStart(s.input, s.cursor);
    // Count corrections as exactly the mistakes that lived in the removed
    // range — not every position that didn't match the target. Otherwise
    // over-backspacing through *correct* characters falsely inflates
    // correctedMistakes and depresses accuracy.
    const corrections = s.mistakes.filter(
      (m) => m.index >= removeTo && m.index < s.cursor,
    ).length;
    const removedFreeChars = countFreeCharsInRange(s, removeTo, s.cursor);
    // Clear any "missed" flags inside the removed range so a retyped word
    // can score normally.
    const nextMissed = new Set(s.missedIndices);
    for (let i = removeTo; i < s.cursor; i++) nextMissed.delete(i);
    return {
      ...s,
      input: s.input.slice(0, removeTo),
      cursor: removeTo,
      correctedMistakes: s.correctedMistakes + corrections,
      mistakes: s.mistakes.filter((m) => m.index < removeTo),
      freeChars: Math.max(0, s.freeChars - removedFreeChars),
      missedIndices: nextMissed,
    };
  }

  if (key === "Enter") {
    return insertChar(s, "\n", now, { autoIndent: true });
  }

  if (key === "Tab") {
    return consumeIndent(s, now);
  }

  if (key === " ") {
    return handleSpace(s, now);
  }

  if (key.length === 1) {
    return insertChar(s, key, now, { autoIndent: false });
  }

  // unknown key — ignore
  return s;
}

function insertChar(
  state: TypingState,
  ch: string,
  now: number,
  opts: { autoIndent: boolean },
): TypingState {
  const expected = state.target[state.cursor];
  let next: TypingState = {
    ...state,
    input: state.input + ch,
    cursor: state.cursor + 1,
  };

  if (expected !== undefined && expected !== ch) {
    next = {
      ...next,
      mistakes: [
        ...next.mistakes,
        { index: state.cursor, expected, actual: ch, timestamp: now },
      ],
    };
  } else if (expected === undefined) {
    // extra character past end of target
    next = {
      ...next,
      mistakes: [
        ...next.mistakes,
        { index: state.cursor, expected: "", actual: ch, timestamp: now },
      ],
    };
  }

  if (opts.autoIndent && ch === "\n" && expected === "\n") {
    // Auto-advance past leading whitespace on the next line so the user
    // doesn't have to "earn" their indent twice (Enter then Tab/spaces).
    let i = next.cursor;
    while (
      i < next.target.length &&
      (next.target[i] === " " || next.target[i] === "\t") &&
      next.target[i] !== "\n"
    ) {
      i++;
    }
    if (i > next.cursor) {
      const free = i - next.cursor;
      next = {
        ...next,
        input: next.input + next.target.slice(next.cursor, i),
        cursor: i,
        freeChars: next.freeChars + free,
      };
    }
  }

  if (
    next.cursor === next.target.length &&
    next.input === next.target &&
    next.completedAt === undefined
  ) {
    next = { ...next, completedAt: now };
  }

  return next;
}

/**
 * SPACE keystroke — Monkeytype "smart space" behavior.
 *
 *  - If the target wants a space here, just insert it normally.
 *  - If the target wants a newline or tab, insert the space as a literal
 *    wrong char (the user clearly meant to hit a whitespace key but the
 *    wrong one; smart-skip would be aggressive here).
 *  - Otherwise — target is mid-token — skip the cursor forward to the
 *    next whitespace boundary (space, tab, or newline), marking every
 *    intermediate position as "missed". If the boundary is a literal
 *    space, consume it too (so the user lands on the next word). Tab and
 *    newline boundaries are NOT consumed; the user still needs to press
 *    Tab/Enter to take them.
 */
function handleSpace(state: TypingState, now: number): TypingState {
  const expected = state.target[state.cursor];

  // Past end of target — fall through to "extra char" behavior.
  if (expected === undefined) {
    return insertChar(state, " ", now, { autoIndent: false });
  }
  // Target wants whitespace here — let insertChar handle it (correct for
  // space, wrong-but-still-inserted for \n/\t).
  if (expected === " " || expected === "\n" || expected === "\t") {
    return insertChar(state, " ", now, { autoIndent: false });
  }

  // Smart-skip: walk forward to the next whitespace boundary in target.
  let i = state.cursor;
  while (
    i < state.target.length &&
    state.target[i] !== " " &&
    state.target[i] !== "\n" &&
    state.target[i] !== "\t"
  ) {
    i++;
  }

  const skipped = state.target.slice(state.cursor, i);
  const skippedCount = i - state.cursor;
  const nextMissed = new Set(state.missedIndices);
  const nextMistakes = state.mistakes.slice();
  for (let j = state.cursor; j < i; j++) {
    nextMissed.add(j);
    nextMistakes.push({
      index: j,
      expected: state.target[j],
      actual: "",
      timestamp: now,
    });
  }
  let nextInput = state.input + skipped;
  let nextCursor = i;
  // Consume the boundary only if it's a literal space (so a single SPACE
  // press lands the user on the next word). Newlines/tabs stay pending so
  // the user explicitly presses Enter/Tab next.
  if (i < state.target.length && state.target[i] === " ") {
    nextInput += " ";
    nextCursor = i + 1;
  }

  let next: TypingState = {
    ...state,
    input: nextInput,
    cursor: nextCursor,
    startedAt: state.startedAt ?? now,
    mistakes: nextMistakes,
    missedIndices: nextMissed,
    // Missed chars are auto-filled into input. They are NOT real
    // keystrokes — count them as "free" so they don't inflate WPM.
    // Accuracy still penalizes them via the correctChars exclusion in
    // metrics.ts (missed positions don't count as correct).
    freeChars: state.freeChars + skippedCount,
  };

  if (
    next.cursor === next.target.length &&
    next.input === next.target &&
    next.completedAt === undefined
  ) {
    next = { ...next, completedAt: now };
  }
  return next;
}

function consumeIndent(state: TypingState, now: number): TypingState {
  // If the target at cursor is whitespace, consume the whole run.
  // If not, ignore Tab (don't insert a literal tab character).
  let i = state.cursor;
  while (
    i < state.target.length &&
    (state.target[i] === " " || state.target[i] === "\t") &&
    state.target[i] !== "\n"
  ) {
    i++;
  }
  if (i === state.cursor) return state; // no whitespace to consume
  const slice = state.target.slice(state.cursor, i);
  const free = i - state.cursor;
  let next: TypingState = {
    ...state,
    input: state.input + slice,
    cursor: i,
    startedAt: state.startedAt ?? now,
    freeChars: state.freeChars + free,
  };
  if (
    next.cursor === next.target.length &&
    next.input === next.target &&
    next.completedAt === undefined
  ) {
    next = { ...next, completedAt: now };
  }
  return next;
}

function countFreeCharsInRange(
  state: TypingState,
  from: number,
  to: number,
): number {
  // freeChars accumulates from three sources: smart-Enter auto-indent,
  // smart-Tab whitespace consumption, and smart-space missed positions.
  // Each contributes positions whose input chars were auto-filled from
  // target, not user-typed. We approximate the count in [from, to) as:
  //   - any position marked "missed" (smart-space auto-fill)
  //   - target whitespace positions whose input matched (smart Tab/Enter)
  // capped by state.freeChars so over-counting can't drive it negative.
  if (state.freeChars === 0) return 0;
  let count = 0;
  for (let i = from; i < to && i < state.target.length; i++) {
    if (state.missedIndices.has(i)) {
      count++;
      continue;
    }
    const t = state.target[i];
    if ((t === " " || t === "\t" || t === "\n") && state.input[i] === t) count++;
  }
  return Math.min(count, state.freeChars);
}

function findWordStart(input: string, cursor: number): number {
  // Standard editor behavior: ctrl+backspace deletes either a run of
  // whitespace OR a run of word chars (whichever is to the left of the
  // cursor), not both. Pressing it twice will collapse trailing whitespace
  // first, then the prior word.
  let i = cursor - 1;
  if (i < 0) return 0;
  const isWs = /\s/.test(input[i]);
  while (i >= 0 && /\s/.test(input[i]) === isWs) i--;
  return i + 1;
}

function findTokenStart(input: string, cursor: number): number {
  let i = cursor - 1;
  if (i < 0) return 0;
  const ch = input[i];
  if (TOKEN_RE.test(ch)) {
    while (i >= 0 && TOKEN_RE.test(input[i])) i--;
  } else {
    // delete one non-token char
    i--;
  }
  return i + 1;
}
