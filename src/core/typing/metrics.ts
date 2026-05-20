import { countBoundaryExtras, type TypingState } from "./typingEngine";

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
  // freeChars = smart-Enter indent + smart-Tab indent + smart-space
  // missed fillers. They aren't real keystrokes — excluded from WPM
  // denominators. correctChars also excludes them so a Tab that
  // auto-fills 4 spaces doesn't count as 4 correct chars (which would
  // push accuracy above 100% when paired with the reduced denominator).
  const keptKeystrokes = Math.max(0, state.input.length - state.freeChars);
  const boundaryExtraCount = countBoundaryExtras(state);
  // Boundary extras are real keystrokes (each one is a wrong key the user
  // pressed) so they count toward the WPM denominator and the accuracy
  // denominator. They live outside input/cursor, so add them explicitly.
  const userKeystrokes =
    keptKeystrokes + state.correctedMistakes + boundaryExtraCount;
  const missedCount = state.missedIndices.size;

  let correctChars = 0;
  for (let i = 0; i < state.input.length; i++) {
    if (state.freeIndices.has(i)) continue; // auto-filled, doesn't score either way
    if (i < state.target.length && state.input[i] === state.target[i]) {
      correctChars++;
    }
  }

  // Accuracy includes misses in the denominator so smart-skips hurt
  // accuracy the same way wrong/uncorrected chars do — matches the
  // Monkeytype model and matches user expectation ("you missed a word").
  const accuracyDenominator = userKeystrokes + missedCount;
  const rawWpm = minutes > 0 ? Math.round(userKeystrokes / 5 / minutes) : 0;
  const codeWpm = minutes > 0 ? Math.round(correctChars / 5 / minutes) : 0;
  const accuracy =
    accuracyDenominator > 0 ? correctChars / accuracyDenominator : 1;

  const uncorrectedMistakes = state.mistakes.length + boundaryExtraCount;
  const progress =
    state.target.length === 0 ? 1 : correctChars / state.target.length;

  return {
    rawWpm,
    codeWpm,
    accuracy,
    mistakes: uncorrectedMistakes + state.correctedMistakes,
    correctedMistakes: state.correctedMistakes,
    uncorrectedMistakes,
    elapsedMs,
    charsTyped: userKeystrokes,
    progress: Math.min(1, Math.max(0, progress)),
  };
}
