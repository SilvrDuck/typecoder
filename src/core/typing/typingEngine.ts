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
  input: string;
  cursor: number;
  startedAt?: number;
  completedAt?: number;
  mistakes: TypingMistake[];
  correctedMistakes: number;
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
 * Returns the per-position character status. Length === max(cursor, target.length).
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
    const removed = s.input.slice(removeTo, s.cursor);
    const corrections = countCorrections(s, removeTo, s.cursor);
    const newInput = s.input.slice(0, removeTo);
    return {
      ...s,
      input: newInput,
      cursor: removeTo,
      correctedMistakes: s.correctedMistakes + corrections,
      // Drop mistakes whose index >= removeTo so they can be remade
      mistakes: s.mistakes.filter((m) => m.index < removeTo),
      // unused but keep removed in case future hook wants it
      ...(removed ? {} : {}),
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
      next = {
        ...next,
        input: next.input + next.target.slice(next.cursor, i),
        cursor: i,
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
  let next: TypingState = {
    ...state,
    input: state.input + slice,
    cursor: i,
    startedAt: state.startedAt ?? now,
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

function countCorrections(state: TypingState, from: number, to: number): number {
  let n = 0;
  for (let i = from; i < to; i++) {
    if (i >= state.target.length) n++;
    else if (state.input[i] !== state.target[i]) n++;
  }
  return n;
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
