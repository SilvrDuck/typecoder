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
 *   • Boundary extras: when target at cursor is structural whitespace
 *     (' ', '\t', '\n') and the user types a non-matching key, the typed
 *     char is recorded as an EXTRA attached to the current cursor position
 *     (the boundary). Cursor does NOT advance; the structural whitespace
 *     is preserved. Mirrors Monkeytype's "word's extras" — typed chars
 *     past the end of a word stay attached to that word, never consume
 *     the boundary space or the next line. Capped at MAX_EXTRAS PER
 *     boundary — each word can independently accumulate up to the cap,
 *     so blowing through one word doesn't starve the next one.
 *
 *   • SPACE:
 *       - target wants a literal space → matches (correct).
 *       - target wants \n or \t → boundary-extra (typed ' ' attached).
 *       - target wants a non-whitespace char:
 *           · cursor is at the START of the current word, nothing typed
 *             yet → no-op (Monkeytype rule 1.1).
 *           · cursor is INSIDE the word but the word is NOT followed by
 *             a literal space (i.e., it's the last word of the line/file
 *             — boundary is \n, \t, or end-of-target) → no-op. Smart-skip
 *             is only meaningful when there's an actual space to jump to.
 *           · cursor is INSIDE a space-bounded word → smart-skip: mark
 *             the remaining positions of the word as "missed", advance
 *             cursor to end of word, then consume the trailing space.
 *       - past end of target → counts as an extra char.
 *     SPACE is never inserted as a "wrong" char.
 *
 *   • TAB: if target at cursor is a run of [space|tab], consume the run
 *     (smart-tab; CodeType-specific convenience). Otherwise no-op (Tab is
 *     not a typical mash-key, no point promoting it to an extra).
 *
 *   • ENTER: if target wants "\n", insert and auto-skip next line's
 *     [space|tab] indent. If target wants ' ' or '\t', boundary-extra
 *     (typed '\n' attached). Otherwise insert wrong "\n" (glyph-only).
 *
 *   • Regular printable keys: insert at cursor. Matches → correct.
 *     Mismatch with non-whitespace target → wrong. Mismatch with
 *     whitespace target → boundary-extra. Past end of target → past-end
 *     extra (cap at MAX_EXTRAS per attachment point).
 *
 *   • Backspace: pop boundary extras at cursor first; once empty, delete
 *     one char of input (or word/token with ctrl/alt). Decrements
 *     free/missed sets as needed; popping an extra → +1 correctedMistakes.
 *
 *   • Completion: cursor === target.length AND input === target.
 *     (Boundary extras don't block completion — they're just lingering
 *     mistakes, same as past-end extras.)
 *
 * Invariant: cursor === input.length. Boundary extras live OUTSIDE input,
 * keyed by the target index they precede. The engine is pure: applyKey
 * returns a new state without mutating its input.
 */

/** Per-boundary cap for boundary extras AND the past-end overflow buffer.
 *  Sized for code typing: words are short so a small cap (a) keeps the
 *  line visually readable and (b) nudges the typist to stop mashing and
 *  advance. The cap applies INDEPENDENTLY to each attachment point — so
 *  word A filling its 8 extras doesn't prevent word B from getting its
 *  own 8. */
export const MAX_EXTRAS = 8;

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
  /**
   * Boundary extras: typed-but-unmatched chars attached to a cursor
   * position where target wants structural whitespace. Keyed by the
   * target index they appear BEFORE. Renderer draws them inline (red)
   * just left of the structural-whitespace cell. They count toward
   * uncorrected mistakes and accuracy denominator but live outside the
   * input/cursor alignment so the structural whitespace is preserved.
   */
  extras: Map<number, string>;
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
 *  in a whitespace gap or past the last word. The `cursor === w.end`
 *  branch is intentionally kept for callers other than handleSpace
 *  (which guards it earlier by checking that target[cursor] is
 *  non-whitespace — at word.end target is always whitespace or
 *  undefined). */
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
    extras: new Map<number, string>(),
  };
}

/** Sum of all boundary-extra chars across positions. */
export function countBoundaryExtras(state: TypingState): number {
  let n = 0;
  for (const v of state.extras.values()) n += v.length;
  return n;
}

/** True if the boundary at `cursor` can still hold another extra. */
function canAcceptBoundaryExtra(state: TypingState, cursor: number): boolean {
  const here = state.extras.get(cursor)?.length ?? 0;
  return here < MAX_EXTRAS;
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
    // User pressed the wrong whitespace key. Treat as a boundary extra
    // attached to the current cursor position — never consume the
    // structural whitespace.
    return appendBoundaryExtra(state, " ", now);
  }

  // Target is non-whitespace. Cursor is inside or at the start of a word.
  const word = wordAt(state, state.cursor);
  if (!word) return state;

  // Rule 1.1: at the start of a word with nothing typed → no-op.
  if (state.cursor === word.start) return state;

  // Smart-skip is only meaningful when the boundary is a literal space.
  // If the word ends at \n, \t, or end-of-target, SPACE is a no-op —
  // marking the rest of the word as missed feels punitive when the user
  // hasn't even reached a space boundary worth skipping to.
  if (state.target[word.end] !== " ") return state;

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

  // target[skipTo] === " " is guaranteed by the boundary guard above.
  // Consume that literal space as a real user keystroke (NOT free).
  const nextInput = state.input + filler + " ";
  const nextCursor = skipTo + 1;

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
  // Enter at a non-newline whitespace boundary (' ' or '\t') is a
  // boundary extra, not a wrong-overwrite of the whitespace.
  if (expected === " " || expected === "\t") {
    return appendBoundaryExtra(state, "\n", now);
  }
  let next: TypingState =
    expected === "\n"
      ? insertExpected(state, "\n", now)
      : insertWrong(state, "\n", now);

  // Smart-Enter: only if newline matched, auto-skip the next line indent.
  if (expected !== "\n") return next;

  // Walk forward through [space|tab] only. '\n' is neither, so the loop
  // stops naturally at the next line boundary if there's a blank line.
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
  // Smart-Tab: consume any run of [space|tab] at cursor. '\n' is neither,
  // so Tab pressed at a newline boundary is a no-op (user must press Enter).
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
  // Wrong key at a structural-whitespace boundary: attach as boundary
  // extra. The whitespace is preserved; the typed char renders as a red
  // extra glyph immediately before it.
  if (expected === " " || expected === "\n" || expected === "\t") {
    return appendBoundaryExtra(state, ch, now);
  }
  return insertWrong(state, ch, now);
}

function appendBoundaryExtra(
  state: TypingState,
  ch: string,
  _now: number,
): TypingState {
  if (!canAcceptBoundaryExtra(state, state.cursor)) return state;
  const next = new Map(state.extras);
  next.set(state.cursor, (next.get(state.cursor) ?? "") + ch);
  return { ...state, extras: next };
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
  // Boundary extras at the current cursor are popped FIRST (they sit
  // visually "to the left of" the current cursor cell).
  const here = state.extras.get(state.cursor);
  if (here && here.length > 0) {
    // ctrl/meta/alt all clear the whole boundary buffer at once —
    // boundary extras are conceptually a single "word fragment" attached
    // to the current position, so any of the word/token-backspace
    // modifiers should empty it in one shot rather than popping one char.
    const popAll = meta.ctrl || meta.meta || meta.alt;
    const popCount = popAll ? here.length : 1;
    const remaining = here.slice(0, here.length - popCount);
    const next = new Map(state.extras);
    if (remaining.length === 0) next.delete(state.cursor);
    else next.set(state.cursor, remaining);
    return {
      ...state,
      extras: next,
      correctedMistakes: state.correctedMistakes + popCount,
    };
  }
  if (state.cursor === 0) return state;
  const word = meta.ctrl || meta.meta;
  const token = meta.alt;
  let removeTo = state.cursor - 1;
  if (word) removeTo = findWordStart(state.input, state.cursor);
  else if (token) removeTo = findTokenStart(state.input, state.cursor);
  else {
    // Plain backspace: if we'd land immediately after a missed-char block
    // (smart-skip residue), undo the whole block atomically.
    while (removeTo > 0 && state.missedIndices.has(removeTo - 1)) {
      removeTo--;
    }
  }

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
