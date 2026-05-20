import { useEffect, useMemo, useRef } from "react";
import {
  applyKey,
  charStatuses,
  isComplete,
  type CharStatus,
  type TypingState,
} from "@/core/typing/typingEngine";

type Props = {
  state: TypingState;
  onChange: (next: TypingState) => void;
  onComplete: () => void;
  /** Disable the surface (e.g. show pause/menu over it). */
  disabled?: boolean;
};

/**
 * Custom-rendered typing surface.
 *
 * Rendering rules (mirrors Monkeytype's `indicateTypos: "replace"`):
 *   - pending  → expected target char (dim)
 *   - correct  → expected target char (bright)
 *   - wrong    → **the char the user typed** in red, so the user can see
 *                what they hit. Whitespace mistakes get a small glyph
 *                (· → ↵). Wrong-on-target-newline still emits a line break
 *                so layout follows the target.
 *   - extra    → typed char in red, also with whitespace glyphs
 *
 * The caret is a 2px-wide block on the current cursor cell, or a trailing
 * block when the cursor sits past the last cell (input.length ===
 * target.length but not yet complete).
 */
export function TypingSurface({ state, onChange, onComplete, disabled }: Props) {
  const captureRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!disabled) captureRef.current?.focus();
  }, [state.target, disabled]);

  const wasCompleteRef = useRef(false);
  useEffect(() => {
    const done = isComplete(state);
    if (done && !wasCompleteRef.current) {
      wasCompleteRef.current = true;
      onComplete();
    }
    if (!done) wasCompleteRef.current = false;
  }, [state, onComplete]);

  const statuses = useMemo(() => charStatuses(state), [state]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (disabled) return;
    if (e.key.length > 1) {
      const handled = ["Backspace", "Enter", "Tab"];
      if (!handled.includes(e.key)) return;
    }
    if (e.key === "Escape") return;
    if (e.key === "Tab" || e.key === "Enter" || e.key === "Backspace") {
      e.preventDefault();
    }
    const next = applyKey(state, e.key, {
      ctrl: e.ctrlKey,
      meta: e.metaKey,
      alt: e.altKey,
      shift: e.shiftKey,
    });
    if (next !== state) onChange(next);
  }

  const cells = renderChars(state.target, state.input, statuses);
  const trailingCaret =
    state.input.length === state.target.length &&
    state.input !== state.target;

  return (
    <div
      role="region"
      aria-label="Typing surface"
      className="relative font-mono text-base leading-7"
      onClick={() => captureRef.current?.focus()}
      data-testid="typing-surface"
    >
      <textarea
        ref={captureRef}
        className="typing-capture"
        aria-hidden="true"
        tabIndex={0}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        onKeyDown={handleKeyDown}
        onChange={() => {
          /* swallow — we read from keydown only */
        }}
        value=""
        readOnly={false}
      />
      <pre
        className="whitespace-pre-wrap break-words m-0 p-0"
        style={{ tabSize: 2 }}
        aria-live="polite"
        aria-atomic="false"
      >
        {cells}
        {trailingCaret && <TrailingCaret />}
      </pre>
    </div>
  );
}

function renderChars(
  target: string,
  input: string,
  statuses: CharStatus[],
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const n = Math.max(target.length, input.length);
  for (let i = 0; i < n; i++) {
    nodes.push(
      <Char
        key={i}
        index={i}
        expected={target[i]}
        typed={input[i]}
        status={statuses[i]}
        caret={i === input.length}
      />,
    );
  }
  return nodes;
}

function Char({
  index,
  expected,
  typed,
  status,
  caret,
}: {
  index: number;
  expected: string | undefined;
  typed: string | undefined;
  status: CharStatus;
  caret: boolean;
}) {
  return (
    <span
      data-index={index}
      data-status={status}
      className={`relative ${colorClass(status)}`}
    >
      {caret && <Caret />}
      {renderCell(expected, typed, status)}
    </span>
  );
}

function Caret() {
  return (
    <span
      aria-hidden="true"
      className="inline-block w-[2px] h-[1.2em] bg-accent absolute -translate-x-[1px] top-[0.15em] animate-caret"
    />
  );
}

function TrailingCaret() {
  return (
    <span
      aria-hidden="true"
      data-testid="trailing-caret"
      className="inline-block w-[2px] h-[1.2em] bg-accent align-text-bottom animate-caret"
    />
  );
}

function colorClass(status: CharStatus): string {
  switch (status) {
    case "pending":
      return "text-ink-500";
    case "correct":
      return "text-ink-100";
    case "wrong":
      return "text-err underline decoration-err/50 underline-offset-2";
    case "extra":
      return "text-err/80 underline decoration-err/40 underline-offset-2";
  }
}

/**
 * What to draw inside a cell, given expected/typed/status.
 *
 * Replace-mode: wrong cells show the typed char (Monkeytype `indicateTypos:
 * "replace"`). Whitespace typed-chars become visible glyphs so the user
 * never sees an "empty" red cell.
 *
 * When the target char is a newline, the cell still emits "\n" so the
 * rendered layout follows the target's line breaks even when the typed
 * char was something else.
 */
function renderCell(
  expected: string | undefined,
  typed: string | undefined,
  status: CharStatus,
): React.ReactNode {
  if (status === "pending" || status === "correct") {
    // Real \t and \n; <pre style={{tabSize: 2}}> renders them consistently.
    return expected ?? "";
  }
  // wrong | extra → show what the user typed. typed is always defined for
  // these statuses (cell only exists because input[i] exists).
  const t = typed ?? "";
  const glyph = whitespaceGlyph(t);
  if (expected === "\n") {
    // Wrong cell where target wanted a line break: emit the glyph for the
    // wrong char, then "\n" so the rendered layout still breaks here.
    return (
      <>
        {glyph ?? t}
        {"\n"}
      </>
    );
  }
  return glyph ?? t;
}

function whitespaceGlyph(ch: string): React.ReactNode | null {
  if (ch === " ") {
    return (
      <span aria-hidden="true" className="opacity-70">
        ·
      </span>
    );
  }
  if (ch === "\t") {
    return (
      <span aria-hidden="true" className="opacity-70">
        →
      </span>
    );
  }
  if (ch === "\n") {
    return (
      <span aria-hidden="true" className="opacity-70">
        ↵
      </span>
    );
  }
  return null;
}
