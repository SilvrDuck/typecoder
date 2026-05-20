import { Kbd } from "./Panel";

export type Hint = { keys: string[]; label: string; testId?: string };

/**
 * A consistent row of keyboard hints used at the bottom of every menu.
 * Keys render as <Kbd> chips, label is dim mono.
 */
export function HotkeyHints({
  hints,
  className = "",
}: {
  hints: Hint[];
  className?: string;
}) {
  return (
    <div
      className={`flex gap-x-4 gap-y-2 flex-wrap font-mono text-2xs text-ink-400 ${className}`}
      data-testid="hotkey-hints"
    >
      {hints.map((h, i) => (
        <span key={i} className="inline-flex items-center gap-1.5" data-testid={h.testId}>
          {h.keys.map((k, j) => (
            <Kbd key={j}>{k}</Kbd>
          ))}
          <span className="ml-1">{h.label}</span>
        </span>
      ))}
    </div>
  );
}
