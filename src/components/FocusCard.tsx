import { Panel } from "./Panel";
import { Button } from "./Button";
import type { ResolvedItem } from "@/core/config/resolveConfig";

type Props = {
  item: ResolvedItem;
  onStart: () => void;
  onSkipIntros: () => void;
};

/**
 * Optional per-item intro card. Shown before guided-session items so
 * the user knows why they're typing this particular snippet.
 */
export function FocusCard({ item, onStart, onSkipIntros }: Props) {
  const heading = item.symbol || item.path.split("/").pop() || item.path;
  return (
    <Panel className="max-w-2xl">
      <p className="font-mono text-2xs text-ink-400 tracking-wider uppercase mb-3">
        {item.level} · {item.path}
      </p>
      <h3 className="font-mono text-xl text-ink-100 mb-4">{heading}</h3>
      <p className="text-ink-300 text-sm leading-relaxed mb-6">
        {item.label}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button intent="primary" mono onClick={onStart} data-testid="focus-start">
          Start
        </Button>
        <Button intent="ghost" mono onClick={onSkipIntros}>
          Skip intro cards
        </Button>
      </div>
    </Panel>
  );
}
