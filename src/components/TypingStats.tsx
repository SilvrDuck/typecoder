import { useEffect, useState } from "react";
import { calculateMetrics } from "@/core/typing/metrics";
import type { TypingState } from "@/core/typing/typingEngine";

type Props = {
  state: TypingState;
  progress: { current: number; total: number };
};

export function TypingStats({ state, progress }: Props) {
  // Force a re-render every 250ms so wpm/elapsed update live without
  // overrunning the typing input handler.
  const [, setNow] = useState(0);
  useEffect(() => {
    if (state.completedAt !== undefined) return;
    if (!state.startedAt) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [state.startedAt, state.completedAt]);

  const m = calculateMetrics(state, Date.now());
  const accPct = Math.round(m.accuracy * 1000) / 10;
  return (
    <div
      className="font-mono text-xs text-ink-300 flex flex-wrap gap-x-5 gap-y-1"
      data-testid="typing-stats"
    >
      <span>
        <span className="text-ink-500">wpm</span>{" "}
        <span className="text-ink-100" data-testid="stat-wpm">
          {m.codeWpm}
        </span>
      </span>
      <span>
        <span className="text-ink-500">acc</span>{" "}
        <span className="text-ok" data-testid="stat-acc">
          {Number.isFinite(accPct) ? accPct.toFixed(1) : "100.0"}%
        </span>
      </span>
      <span>
        <span className="text-ink-500">err</span>{" "}
        <span className="text-err" data-testid="stat-err">
          {m.mistakes}
        </span>
      </span>
      <span className="text-ink-500" data-testid="stat-progress">
        {progress.current} / {progress.total}
      </span>
    </div>
  );
}
