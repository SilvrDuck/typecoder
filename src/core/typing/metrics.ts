import type { TypingState } from "./typingEngine";

export type TypingMetrics = {
  rawWpm: number;
  codeWpm: number;
  accuracy: number; // 0..1
  mistakes: number;
  correctedMistakes: number;
  uncorrectedMistakes: number;
  elapsedMs: number;
  charsTyped: number;
  progress: number; // 0..1
};

/**
 * - rawWpm:  total keystrokes / 5 / minutes
 * - codeWpm: same denominator but only counts characters that currently match
 *            the target ("net" characters of correct code typed).
 * - accuracy: net correct chars / total keystrokes typed (incl. mistakes
 *            that were later backspaced).
 *
 * `charsTyped` counts every keystroke, including ones the user has since
 * deleted — this is the right denominator for accuracy.
 */
export function calculateMetrics(
  state: TypingState,
  now: number,
): TypingMetrics {
  const elapsedMs =
    state.completedAt !== undefined && state.startedAt !== undefined
      ? state.completedAt - state.startedAt
      : state.startedAt !== undefined
        ? Math.max(0, now - state.startedAt)
        : 0;
  const minutes = elapsedMs / 60_000;

  // Total keystrokes the user has ever produced. Each entry in
  // state.input is a kept keystroke, MINUS the freeChars that smart Enter
  // / smart Tab auto-consumed (those weren't real keystrokes — a single
  // Tab can eat 4 spaces and should not count as 4 keystrokes for WPM).
  // Mistakes that were backspaced are tracked in state.correctedMistakes.
  const keptKeystrokes = Math.max(0, state.input.length - state.freeChars);
  const totalKeystrokes = keptKeystrokes + state.correctedMistakes;

  let correctChars = 0;
  for (let i = 0; i < state.input.length; i++) {
    if (i < state.target.length && state.input[i] === state.target[i]) {
      correctChars++;
    }
  }

  const rawWpm = minutes > 0 ? Math.round(totalKeystrokes / 5 / minutes) : 0;
  const codeWpm = minutes > 0 ? Math.round(correctChars / 5 / minutes) : 0;
  const accuracy =
    totalKeystrokes > 0 ? correctChars / totalKeystrokes : 1;

  const uncorrectedMistakes = state.mistakes.length;
  const progress =
    state.target.length === 0 ? 1 : correctChars / state.target.length;

  return {
    rawWpm,
    codeWpm,
    accuracy,
    mistakes: state.mistakes.length + state.correctedMistakes,
    correctedMistakes: state.correctedMistakes,
    uncorrectedMistakes,
    elapsedMs,
    charsTyped: totalKeystrokes,
    progress: Math.min(1, Math.max(0, progress)),
  };
}
