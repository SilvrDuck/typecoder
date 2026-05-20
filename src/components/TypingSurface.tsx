import { useEffect, useMemo, useRef, useState } from "react";
import {
  applyKey,
  charStatuses,
  isComplete,
  type CharStatus,
  type TypingState,
} from "@/core/typing/typingEngine";
import {
  buildTokenColorMap,
  shikiLangFromPath,
  type TokenColorMap,
} from "@/core/typing/syntaxHighlight";
import { useAppStore } from "@/state/useAppStore";

type Props = {
  state: TypingState;
  onChange: (next: TypingState) => void;
  onComplete: () => void;
  /** Disable the surface (e.g. show pause/menu over it). */
  disabled?: boolean;
  /** Source path for the snippet — drives the Shiki language pick. */
  path?: string;
  /** Lines from the source file BEFORE the typed snippet, dimmed. */
  preContext?: string;
  /** Lines from the source file AFTER the typed snippet, dimmed. */
  postContext?: string;
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
export function TypingSurface({
  state,
  onChange,
  onComplete,
  disabled,
  path,
  preContext,
  postContext,
}: Props) {
  const captureRef = useRef<HTMLTextAreaElement>(null);
  const theme = useAppStore((s) => s.theme);
  const [tokenColors, setTokenColors] = useState<TokenColorMap>([]);
  const [preTokens, setPreTokens] = useState<TokenColorMap>([]);
  const [postTokens, setPostTokens] = useState<TokenColorMap>([]);

  useEffect(() => {
    let cancelled = false;
    const lang = path ? shikiLangFromPath(path) : null;
    if (!lang || !state.target) {
      setTokenColors([]);
      setPreTokens([]);
      setPostTokens([]);
      return;
    }
    Promise.all([
      buildTokenColorMap(state.target, lang, theme),
      preContext ? buildTokenColorMap(preContext, lang, theme) : Promise.resolve([] as TokenColorMap),
      postContext ? buildTokenColorMap(postContext, lang, theme) : Promise.resolve([] as TokenColorMap),
    ])
      .then(([main, pre, post]) => {
        if (cancelled) return;
        setTokenColors(main);
        setPreTokens(pre);
        setPostTokens(post);
      })
      .catch(() => {
        if (cancelled) return;
        setTokenColors([]);
        setPreTokens([]);
        setPostTokens([]);
      });
    return () => {
      cancelled = true;
    };
  }, [state.target, path, theme, preContext, postContext]);

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

  const cells = renderChars(state.target, state.input, statuses, state.extras, tokenColors);
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
        className="whitespace-pre m-0 p-0 overflow-x-auto"
        style={{ tabSize: 2 }}
        aria-live="polite"
        aria-atomic="false"
      >
        {preContext && (
          <ContextBlock
            text={preContext}
            tokens={preTokens}
            position="pre"
          />
        )}
        {cells}
        {trailingCaret && <TrailingCaret />}
        {postContext && (
          <ContextBlock
            text={postContext}
            tokens={postTokens}
            position="post"
          />
        )}
      </pre>
    </div>
  );
}

function renderChars(
  target: string,
  input: string,
  statuses: CharStatus[],
  extras: Map<number, string>,
  tokenColors: TokenColorMap,
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const n = Math.max(target.length, input.length);
  for (let i = 0; i < n; i++) {
    const extra = extras.get(i);
    if (extra) {
      for (let k = 0; k < extra.length; k++) {
        nodes.push(<ExtraGlyph key={`x-${i}-${k}`} ch={extra[k]} />);
      }
    }
    nodes.push(
      <Char
        key={i}
        index={i}
        expected={target[i]}
        typed={input[i]}
        status={statuses[i]}
        caret={i === input.length}
        tokenColor={tokenColors[i] ?? ""}
      />,
    );
  }
  return nodes;
}

/** A red typed-char glyph rendered inline at a whitespace boundary. */
function ExtraGlyph({ ch }: { ch: string }) {
  const glyph = whitespaceGlyph(ch);
  return (
    <span data-status="extra" className={colorClass("extra")}>
      {glyph ?? ch}
    </span>
  );
}

function Char({
  index,
  expected,
  typed,
  status,
  caret,
  tokenColor,
}: {
  index: number;
  expected: string | undefined;
  typed: string | undefined;
  status: CharStatus;
  caret: boolean;
  tokenColor: string;
}) {
  // Wrong/extra/missed always use the error palette (no syntax color).
  // Pending shows the syntax color dimmed; correct shows it full.
  const useSyntax = tokenColor && (status === "pending" || status === "correct");
  const style: React.CSSProperties | undefined = useSyntax
    ? { color: tokenColor, opacity: status === "pending" ? 0.45 : 1 }
    : undefined;
  return (
    <span
      data-index={index}
      data-status={status}
      className={`relative ${useSyntax ? "" : colorClass(status)}`}
      style={style}
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
    case "missed":
      // Skipped via smart-space: expected char shown in dimmed red so the
      // user sees what they didn't type. Distinct from "wrong" (which is
      // a typed-char overlay) and from "pending" (which is dim grey).
      return "text-err/60 underline decoration-err/20 underline-offset-2";
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
  if (status === "missed") {
    // Skipped via smart-space: show the *expected* char (dimmed red via
    // colorClass) so the user sees what they didn't type. Whitespace gets
    // its glyph so a missed indent doesn't render as invisible cells.
    const e = expected ?? "";
    const glyph = whitespaceGlyph(e);
    if (e === "\n") {
      return (
        <>
          {glyph ?? e}
          {"\n"}
        </>
      );
    }
    return glyph ?? e;
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

/**
 * Faded file context: lines before/after the snippet, syntax-colored
 * but dimmed. Inline inside <pre> so newlines render naturally. A
 * single `\n` separator between context and snippet keeps line numbers
 * visually aligned with the source file.
 */
function ContextBlock({
  text,
  tokens,
  position,
}: {
  text: string;
  tokens: TokenColorMap;
  position: "pre" | "post";
}) {
  const nodes: React.ReactNode[] = [];
  for (let i = 0; i < text.length; i++) {
    const color = tokens[i] ?? "";
    nodes.push(
      <span key={i} style={color ? { color } : undefined}>
        {text[i]}
      </span>,
    );
  }
  return (
    <span
      data-testid={`typing-context-${position}`}
      aria-hidden="true"
      className="opacity-30 select-none"
    >
      {position === "post" && "\n"}
      {nodes}
      {position === "pre" && "\n"}
    </span>
  );
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
