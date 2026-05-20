import { useEffect, useMemo, useRef } from "react";
import {
  applyKey,
  charStatuses,
  isComplete,
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
 * - No visible textarea. A hidden input captures keystrokes when the
 *   surface has focus.
 * - Each character of the target is rendered as a span with one of four
 *   classes (pending / correct / wrong / extra) so the typing color
 *   semantics are crisp and deterministic.
 * - The caret is a 1px-wide block on the current position.
 * - Whitespace mistakes get a small glyph (·, →, ↵) so the user can see
 *   what they typed; correctly typed whitespace stays invisible.
 */
export function TypingSurface({ state, onChange, onComplete, disabled }: Props) {
  const captureRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus when mounted or when a new item begins (state.cursor = 0).
  useEffect(() => {
    if (!disabled) captureRef.current?.focus();
  }, [state.target, disabled]);

  // Fire completion exactly once when the engine transitions to complete.
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
    // Ignore modifier-only or function keys
    if (e.key.length > 1) {
      const handled = ["Backspace", "Enter", "Tab"];
      if (!handled.includes(e.key)) return;
    }
    // Allow Esc to bubble (used by the screen-level pause menu later)
    if (e.key === "Escape") return;

    // Block default for keys we handle so the textarea doesn't echo
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
        aria-live="polite"
        aria-atomic="false"
      >
        {renderChars(state.target, state.input, statuses)}
      </pre>
    </div>
  );
}

function renderChars(target: string, input: string, statuses: string[]) {
  const nodes: React.ReactNode[] = [];
  const n = Math.max(target.length, input.length);
  for (let i = 0; i < n; i++) {
    const status = statuses[i];
    const expected = target[i];
    const typed = input[i];
    const isCaret = i === input.length;
    nodes.push(
      <Char
        key={i}
        index={i}
        expected={expected}
        typed={typed}
        status={status}
        caret={isCaret}
      />,
    );
  }
  // Caret at end-of-input when input.length === target.length but no extras yet
  if (input.length === target.length && !nodes.length) {
    nodes.push(<Caret key="end-caret" />);
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
  status: string;
  caret: boolean;
}) {
  const ch = expected ?? typed ?? "";
  const display = displayChar(ch, status, typed);
  const cls = colorClass(status);
  return (
    <span
      data-index={index}
      className={`relative ${cls}`}
      data-status={status}
    >
      {caret && <Caret />}
      {display}
    </span>
  );
}

function Caret() {
  return (
    <span
      aria-hidden="true"
      className="inline-block align-baseline w-[2px] h-[1.2em] bg-accent -ml-[1px] absolute -translate-x-[1px] top-[0.15em] animate-caret"
    />
  );
}

function colorClass(status: string): string {
  switch (status) {
    case "pending":
      return "text-ink-500";
    case "correct":
      return "text-ink-100";
    case "wrong":
      return "text-err underline decoration-err/40";
    case "extra":
      return "text-err underline decoration-err/40";
    default:
      return "";
  }
}

function displayChar(
  expected: string,
  status: string,
  typed: string | undefined,
): React.ReactNode {
  if (expected === "\n") {
    if (status === "correct") return "\n";
    if (status === "wrong" || status === "extra") {
      return (
        <>
          <span aria-hidden="true" className="opacity-40">
            ↵
          </span>
          {"\n"}
        </>
      );
    }
    return "\n";
  }
  if (expected === "\t") {
    return status === "correct" ? "\t" : "  ";
  }
  if (expected === " " && (status === "wrong" || status === "extra")) {
    return (
      <span aria-hidden="true" className="opacity-40">
        ·
      </span>
    );
  }
  if (status === "extra" && typed !== undefined) return typed;
  return expected;
}
