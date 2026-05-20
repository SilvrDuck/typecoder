import { Panel } from "./Panel";
import { Button } from "./Button";
import { calculateMetrics } from "@/core/typing/metrics";
import type { TypingState } from "@/core/typing/typingEngine";

type Props = {
  state: TypingState;
  onNext: () => void;
  onRestart: () => void;
  hasNext: boolean;
};

export function CompletionCard({ state, onNext, onRestart, hasNext }: Props) {
  const m = calculateMetrics(state, Date.now());
  return (
    <Panel className="max-w-md" data-testid="completion-card">
      <h3 className="font-mono text-lg text-ink-100 mb-6">Snippet complete</h3>
      <div className="grid grid-cols-3 gap-6 mb-6">
        <Stat label="code wpm" value={String(m.codeWpm)} />
        <Stat label="accuracy" value={`${(m.accuracy * 100).toFixed(1)}%`} tint="ok" />
        <Stat label="errors" value={String(m.mistakes)} />
      </div>
      <div className="flex gap-2">
        <Button intent="primary" mono onClick={onNext} data-testid="completion-next">
          {hasNext ? "Next" : "Finish"}
        </Button>
        <Button mono onClick={onRestart}>
          Restart
        </Button>
      </div>
    </Panel>
  );
}

function Stat({
  label,
  value,
  tint,
}: {
  label: string;
  value: string;
  tint?: "ok";
}) {
  return (
    <div>
      <div
        className={`font-mono text-2xl ${tint === "ok" ? "text-ok" : "text-ink-100"}`}
      >
        {value}
      </div>
      <div className="font-mono text-2xs text-ink-400 mt-1 uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}
