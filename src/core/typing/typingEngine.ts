/**
 * CodeType typing engine — v2.
 *
 * Clean rewrite. Anchor rules (validated with user, derived from
 * Monkeytype default-config behavior + CodeType code-typing adaptations):
 *
 *   • Word model: a word is a maximal run of non-whitespace chars in
 *     target. Whitespace between words (spaces, tabs, newlines) is
 *     "structural" — typed literally with the matching key.
 *
 *   • SPACE:
 *       - target wants a literal space → matches (correct).
 *       - target wants \n or \t → no-op (user must press Enter/Tab).
 *       - target wants a non-whitespace char:
 *           · cursor is at the START of the current word, nothing typed
 *             yet → no-op (Monkeytype rule 1.1).
 *           · cursor is INSIDE the word → smart-skip: mark the remaining
 *             positions of the word as "missed", advance cursor to end of
 *             word, then consume one trailing literal space if present.
 *       - past end of target → counts as an extra char.
 *     SPACE is never inserted as a "wrong" char.
 *
 *   • TAB: if target at cursor is a run of [space|tab], consume the run
 *     (smart-tab; CodeType-specific convenience). Otherwise no-op.
 *
 *   • ENTER: insert "\n". If target also has "\n" here, auto-advance past
 *     the next line's leading [space|tab] indent (smart-enter).
 *
 *   • Regular printable keys: insert at cursor. Matches → correct.
 *     Mismatch → wrong (counted in mistakes, rendered with replace mode).
 *     Past end of target → "extra" (cap at MAX_EXTRAS chars).
 *
 *   • Backspace: delete one char (or word/token with ctrl/alt).
 *     Decrements free/missed sets as needed.
 *
 *   • Completion: cursor === target.length AND input === target.
 *
 * Invariant: cursor === input.length. The engine is pure: applyKey
 * returns a new state without mutating its input.
 */

export const MAX_EXTRAS = 20;

export type TypingMistake = {
  index: number;
  expected: string;
  actual: string;
  timestamp: number;
};

export type Word = {
  /** Inclusive index into target where the word starts. */
  start: number;
  /** Exclusive index into target where the word ends. */
  end: number;
  text: string;
};

export type TypingState = {
  target: string;
  input: string;
  cursor: number;
  startedAt?: number;
  completedAt?: number;
  mistakes: TypingMistake[];
  correctedMistakes: number;
  /** Number of auto-filled positions in input (smart-Enter/-Tab/-Space). */
  freeChars: number;
  /** Source of truth for which input indices are auto-filled. */
  freeIndices: Set<number>;
  /** Subset of freeIndices: positions skipped by smart-space. */
  missedIndices: Set<number>;
  /** Precomputed runs of non-whitespace target chars. */
  words: Word[];
};

export type KeyMeta = {
  ctrl?: boolean;
  meta?: boolean;
  alt?: boolean;
  shift?: boolean;
  now?: number;
};

export type CharStatus = "pending" | "correct" | "wrong" | "extra" | "missed";

function computeWords(target: string): Word[] {
  const out: Word[] = [];
  for (const m of target.matchAll(/\S+/g)) {
    const i = m.index ?? 0;
    out.push({ start: i, end: i + m[0].length, text: m[0] });
  }
  return out;
}

/** The word containing or just-ended-at `cursor`, or null if cursor sits
 *  in a whitespace gap or past the last word. */
function wordAt(state: TypingState, cursor: number): Word | null {
  for (const w of state.words) {
    if (cursor >= w.start && cursor < w.end) return w;
    if (cursor === w.end) return w;
    if (cursor < w.start) return null;
  }
  return null;
}

export function startTyping(target: string): TypingState {
  return {
    target,
    input: "",
    cursor: 0,
    mistakes: [],
    correctedMistakes: 0,
    freeChars: 0,
    freeIndices: new Set<number>(),
    missedIndices: new Set<number>(),
    words: computeWords(target),
  };
}

export function resetTyping(target: string): TypingState {
  return startTyping(target);
}

export function isComplete(state: TypingState): boolean {
  return state.cursor === state.target.length && state.input === state.target;
}

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

export function applyKey(
  state: TypingState,
  key: string,
  meta: KeyMeta = {},
): TypingState {
  const now = meta.now ?? Date.now();
  let s = state;
  if (!s.startedAt && (key.length === 1 || key === "Tab" || key === "Enter")) {
    s = { ...s, startedAt: now };
  }

  if (key === "Backspace") return handleBackspace(s, meta);
  if (key === "Enter") return handleEnter(s, now);
  if (key === "Tab") return handleTab(s, now);
  if (key === " ") return handleSpace(s, now);
  if (key.length === 1) return handleChar(s, key, now);
  return s;
}

function handleSpace(state: TypingState, now: number): TypingState {
  const expected = state.target[state.cursor];

  if (expected === undefined) {
    return appendExtra(state, " ", now);
  }
  if (expected === " ") {
    return insertExpected(state, " ", now);
  }
  if (expected === "\n" || expected === "\t") {
    // User must press Enter / Tab for these — a space here would be a
    // wrong char in Monkeytype's model; following their lead, suppress.
    return state;
  }

  // Target is non-whitespace. Cursor is inside or at the start of a word.
  const word = wordAt(state, state.cursor);
  if (!word) return state;

  // Rule 1.1: at the start of a word with nothing typed → no-op.
  if (state.cursor === word.start) return state;

  // Smart-skip to end of word.
  const skipFrom = state.cursor;
  const skipTo = word.end;
  const skippedCount = skipTo - skipFrom;
  const filler = state.target.slice(skipFrom, skipTo);
  const nextFree = new Set(state.freeIndices);
  const nextMissed = new Set(state.missedIndices);
  const nextMistakes = state.mistakes.slice();
  for (let j = skipFrom; j < skipTo; j++) {
    nextFree.add(j);
    nextMissed.add(j);
    nextMistakes.push({
      index: j,
      expected: state.target[j],
      actual: "",
      timestamp: now,
    });
  }

  let nextInput = state.input + filler;
  let nextCursor = skipTo;
  // Consume one trailing literal space (a real user keystroke — NOT free).
  if (state.target[skipTo] === " ") {
    nextInput += " ";
    nextCursor = skipTo + 1;
  }

  const next: TypingState = {
    ...state,
    input: nextInput,
    cursor: nextCursor,
    mistakes: nextMistakes,
    freeChars: state.freeChars + skippedCount,
    freeIndices: nextFree,
    missedIndices: nextMissed,
  };
  return maybeComplete(next, now);
}

function handleEnter(state: TypingState, now: number): TypingState {
  const expected = state.target[state.cursor];
  if (expected === undefined) {
    return appendExtra(state, "\n", now);
  }
  let next: TypingState =
    expected === "\n"
      ? insertExpected(state, "\n", now)
      : insertWrong(state, "\n", now);

  // Smart-Enter: only if newline matched, auto-skip the next line indent.
  if (expected !== "\n") return next;

  let i = next.cursor;
  while (
    i < next.target.length &&
    (next.target[i] === " " || next.target[i] === "\t")
  ) {
    i++;
  }
  if (i === next.cursor) return next;

  const nextFree = new Set(next.freeIndices);
  for (let j = next.cursor; j < i; j++) nextFree.add(j);
  next = {
    ...next,
    input: next.input + next.target.slice(next.cursor, i),
    cursor: i,
    freeChars: next.freeChars + (i - next.cursor),
    freeIndices: nextFree,
  };
  return maybeComplete(next, now);
}

function handleTab(state: TypingState, now: number): TypingState {
  // Smart-Tab: if target at cursor is a whitespace run, consume it.
  let i = state.cursor;
  while (
    i < state.target.length &&
    (state.target[i] === " " || state.target[i] === "\t")
  ) {
    i++;
  }
  if (i === state.cursor) return state;

  const free = i - state.cursor;
  const slice = state.target.slice(state.cursor, i);
  const nextFree = new Set(state.freeIndices);
  for (let j = state.cursor; j < i; j++) nextFree.add(j);
  const next: TypingState = {
    ...state,
    input: state.input + slice,
    cursor: i,
    freeChars: state.freeChars + free,
    freeIndices: nextFree,
  };
  return maybeComplete(next, now);
}

function handleChar(
  state: TypingState,
  ch: string,
  now: number,
): TypingState {
  const expected = state.target[state.cursor];
  if (expected === undefined) {
    return appendExtra(state, ch, now);
  }
  if (expected === ch) {
    return insertExpected(state, ch, now);
  }
  return insertWrong(state, ch, now);
}

function insertExpected(
  state: TypingState,
  ch: string,
  now: number,
): TypingState {
  const next: TypingState = {
    ...state,
    input: state.input + ch,
    cursor: state.cursor + 1,
  };
  return maybeComplete(next, now);
}

function insertWrong(
  state: TypingState,
  ch: string,
  now: number,
): TypingState {
  const expected = state.target[state.cursor]!;
  const next: TypingState = {
    ...state,
    input: state.input + ch,
    cursor: state.cursor + 1,
    mistakes: [
      ...state.mistakes,
      { index: state.cursor, expected, actual: ch, timestamp: now },
    ],
  };
  return maybeComplete(next, now);
}

function appendExtra(
  state: TypingState,
  ch: string,
  now: number,
): TypingState {
  const extraCount = state.input.length - state.target.length;
  if (extraCount >= MAX_EXTRAS) return state;
  return {
    ...state,
    input: state.input + ch,
    cursor: state.cursor + 1,
    mistakes: [
      ...state.mistakes,
      { index: state.cursor, expected: "", actual: ch, timestamp: now },
    ],
  };
}

function maybeComplete(state: TypingState, now: number): TypingState {
  if (
    state.cursor === state.target.length &&
    state.input === state.target &&
    state.completedAt === undefined
  ) {
    return { ...state, completedAt: now };
  }
  return state;
}

const TOKEN_RE = /[A-Za-z0-9_$]/;

function handleBackspace(state: TypingState, meta: KeyMeta): TypingState {
  if (state.cursor === 0) return state;
  const word = meta.ctrl || meta.meta;
  const token = meta.alt;
  let removeTo = state.cursor - 1;
  if (word) removeTo = findWordStart(state.input, state.cursor);
  else if (token) removeTo = findTokenStart(state.input, state.cursor);

  const corrections = state.mistakes.filter(
    (m) => m.index >= removeTo && m.index < state.cursor,
  ).length;

  const nextFree = new Set(state.freeIndices);
  const nextMissed = new Set(state.missedIndices);
  let removedFree = 0;
  for (let i = removeTo; i < state.cursor; i++) {
    if (nextFree.delete(i)) removedFree++;
    nextMissed.delete(i);
  }

  return {
    ...state,
    input: state.input.slice(0, removeTo),
    cursor: removeTo,
    correctedMistakes: state.correctedMistakes + corrections,
    mistakes: state.mistakes.filter((m) => m.index < removeTo),
    freeChars: state.freeChars - removedFree,
    freeIndices: nextFree,
    missedIndices: nextMissed,
  };
}

function findWordStart(input: string, cursor: number): number {
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
    i--;
  }
  return i + 1;
}
