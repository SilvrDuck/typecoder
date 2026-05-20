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
export type CharStatus = "pending" | "correct" | "wrong" | "extra";

export function charStatuses(state: TypingState): CharStatus[] {
  const out: CharStatus[] = [];
  const n = Math.max(state.target.length, state.input.length);
  for (let i = 0; i < n; i++) {
    if (i >= state.target.length) {
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
    // freeChars in the removed range need to be decremented from the
    // running count so the denominator stays honest if the user retypes.
    const removedFreeChars = countFreeCharsInRange(s, removeTo, s.cursor);
    return {
      ...s,
      input: s.input.slice(0, removeTo),
      cursor: removeTo,
      correctedMistakes: s.correctedMistakes + corrections,
      mistakes: s.mistakes.filter((m) => m.index < removeTo),
      freeChars: Math.max(0, s.freeChars - removedFreeChars),
    };
  }

  if (key === "Enter") {
    return insertChar(s, "\n", now, { autoIndent: true });
  }

  if (key === "Tab") {
    return consumeIndent(s, now);
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
  // freeChars are auto-injected runs of target whitespace. Approximate
  // the count in [from, to) as: number of target whitespace positions
  // in the range that actually matched (i.e. were auto-consumed rather
  // than manually typed). We can't perfectly distinguish "user typed a
  // space" from "Tab consumed a space" after the fact, so we conservatively
  // count target whitespace in the range capped by `state.freeChars`.
  if (state.freeChars === 0) return 0;
  let ws = 0;
  for (let i = from; i < to && i < state.target.length; i++) {
    const t = state.target[i];
    if ((t === " " || t === "\t" || t === "\n") && state.input[i] === t) ws++;
  }
  return Math.min(ws, state.freeChars);
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
