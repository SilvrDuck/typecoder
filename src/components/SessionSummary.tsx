import { useCallback, useEffect, useMemo } from "react";
import { Mark } from "./Mark";
import { Panel, Pill, Label } from "./Panel";
import { Button } from "./Button";
import { HotkeyHints } from "./HotkeyHints";
import { useAppStore } from "@/state/useAppStore";
import {
  summarizeWeakSpots,
  buildWeakSpotPracticeQueue,
} from "@/core/typing/weakSpots";
import { calculateMetrics } from "@/core/typing/metrics";

export function SessionSummary() {
  const session = useAppStore((s) => s.session);
  const navigate = useAppStore((s) => s.navigate);
  const resetAll = useAppStore((s) => s.resetAll);
  const startSession = useAppStore((s) => s.startSession);

  const aggregate = useMemo(() => {
    if (!session) return null;
    const results = session.results;
    let codeWpmSum = 0;
    let codeWpmCount = 0;
    let accAvg = 0;
    let mistakes = 0;
    for (const r of results) {
      const m = r.restoredMetrics ?? calculateMetrics(r.state, r.state.completedAt ?? Date.now());
      if (m.codeWpm > 0) {
        codeWpmSum += m.codeWpm;
        codeWpmCount++;
      }
      accAvg += m.accuracy;
      mistakes += m.mistakes;
    }
    return {
      codeWpm: codeWpmCount > 0 ? Math.round(codeWpmSum / codeWpmCount) : 0,
      accuracy: results.length ? accAvg / results.length : 1,
      mistakes,
      completed: results.length,
    };
  }, [session]);

  const weakSpots = useMemo(
    () =>
      session
        ? summarizeWeakSpots(session.results, { topChars: 6, topLines: 5 })
        : { hardestChars: [], hardestLines: [] },
    [session],
  );

  if (!session || !aggregate) {
    return (
      <main className="min-h-screen grid place-items-center px-6">
        <p className="font-mono text-sm text-ink-400">No completed session.</p>
      </main>
    );
  }

  function practiceWeakSpots() {
    if (!session) return;
    const queue = buildWeakSpotPracticeQueue(session.results, { maxItems: 5 });
    if (queue.length === 0) {
      navigate({
        name: "error",
        title: "No weak spots to practice",
        detail: "You had no recurring mistakes in this session.",
      });
      return;
    }
    const resolvedItems = queue.map((q, i) => ({
      id: `weak-${i}`,
      label: q.label,
      text: q.text,
      path: q.label,
      level: "file" as const,
      language: session.resolved.items[0]?.language,
    }));
    const weakSpotConfig = {
      version: 1 as const,
      repo: session.config.repo,
      title: `${session.config.title} — weak spots`,
      items: queue.map((q) => ({
        level: "file" as const,
        path: q.label,
        label: q.label,
      })),
    };
    const resolved = {
      title: weakSpotConfig.title,
      repo: weakSpotConfig.repo,
      ref: session.resolved.ref,
      items: resolvedItems,
      errors: [],
    };
    startSession(weakSpotConfig, resolved, `${session.source} — weak spots`);
  }

  const restartSession = useCallback(() => {
    if (!session) return;
    startSession(
      session.config,
      {
        ...session.resolved,
        items: session.resolved.items.map((i) => ({
          ...i,
          // re-initialize typing state on fresh text
          text: i.text,
        })),
      },
      session.source,
    );
  }, [session, startSession]);

  const newSession = useCallback(() => {
    resetAll();
  }, [resetAll]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") {
        e.preventDefault();
        navigate({ name: "landing" });
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        restartSession();
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        newSession();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, restartSession, newSession]);

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <Mark trail={["session complete"]} />
        <h2 className="text-2xl font-semibold tracking-tightish mb-8">
          Session complete
        </h2>

        <Panel className="px-8 py-8 mb-6" data-testid="summary-card">
          <div className="flex gap-12 items-baseline mb-9 flex-wrap">
            <Stat value={String(aggregate.codeWpm)} label="code wpm" />
            <Stat
              value={`${(aggregate.accuracy * 100).toFixed(1)}%`}
              label="accuracy"
              tint="ok"
            />
            <Stat value={String(aggregate.completed)} label="snippets" />
          </div>

          {weakSpots.hardestChars.length > 0 && (
            <>
              <hr className="border-ink-700 my-6" />
              <Label>Hardest characters</Label>
              <div
                className="flex gap-2 flex-wrap mb-7"
                data-testid="summary-hardest-chars"
              >
                {weakSpots.hardestChars.map((c, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center font-mono text-sm rounded-sm border border-ink-700 bg-ink-800 px-3 py-1 text-ink-100"
                  >
                    {displayCharLabel(c.char)}
                    <span className="text-ink-500 ml-2 text-xs">
                      ×{c.count}
                    </span>
                  </span>
                ))}
              </div>
            </>
          )}

          {weakSpots.hardestLines.length > 0 && (
            <>
              <Label>Most error-prone lines</Label>
              <ul
                className="font-mono text-xs text-ink-300 space-y-1"
                data-testid="summary-hardest-lines"
              >
                {weakSpots.hardestLines.map((l, i) => (
                  <li
                    key={i}
                    className="py-1 border-b border-ink-700 last:border-b-0"
                  >
                    {l.preview}
                  </li>
                ))}
              </ul>
            </>
          )}

          {weakSpots.hardestChars.length === 0 &&
            weakSpots.hardestLines.length === 0 && (
              <p className="text-ink-400 text-sm">
                Clean run — no recurring mistakes.
              </p>
            )}
        </Panel>

        <div className="flex flex-wrap gap-2">
          <Button
            intent="primary"
            mono
            onClick={practiceWeakSpots}
            disabled={weakSpots.hardestLines.length === 0}
            data-testid="summary-practice-weak"
          >
            Practice weak spots
          </Button>
          <Button mono onClick={restartSession} data-testid="summary-restart">
            Restart session
          </Button>
          <Button intent="ghost" mono onClick={newSession} data-testid="summary-new">
            New session
          </Button>
        </div>

        <HotkeyHints
          className="mt-8"
          hints={[
            { keys: ["R"], label: "restart" },
            { keys: ["N"], label: "new" },
            { keys: ["Esc"], label: "home" },
          ]}
        />

        <p className="font-mono text-2xs text-ink-500 mt-6 tracking-wider">
          state lives in the URL — copy the link to come back later <Pill>stateless</Pill>
        </p>
      </div>
    </main>
  );
}

function Stat({
  value,
  label,
  tint,
}: {
  value: string;
  label: string;
  tint?: "ok";
}) {
  return (
    <div>
      <div
        className={`font-mono text-4xl md:text-5xl leading-none ${
          tint === "ok" ? "text-ok" : "text-ink-100"
        }`}
      >
        {value}
      </div>
      <div className="font-mono text-2xs uppercase tracking-wider text-ink-400 mt-2">
        {label}
      </div>
    </div>
  );
}

function displayCharLabel(c: string): string {
  if (c === "space") return "␣";
  if (c === "tab") return "→";
  if (c === "newline") return "↵";
  if (c === "extra") return "+";
  return c;
}
