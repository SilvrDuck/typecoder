import { useEffect, useCallback } from "react";
import { Mark } from "./Mark";
import { Panel, Pill } from "./Panel";
import { Button } from "./Button";
import { HotkeyHints } from "./HotkeyHints";
import { CURATED_REPOS, type CuratedRepo } from "@/core/config/curated";
import { useAppStore } from "@/state/useAppStore";
import { startCuratedSession } from "@/core/session/sessionStarter";
import { useEscapeBack } from "@/hooks/useEscapeBack";

export function TypeRightAway() {
  const pickCurated = useAppStore((s) => s.pickCurated);
  useEscapeBack();

  const start = useCallback(
    (c: CuratedRepo) => {
      pickCurated(c);
      void startCuratedSession(c.config, `${c.repo}@${c.config.ref ?? "main"}`);
    },
    [pickCurated],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const idx = ["1", "2", "3"].indexOf(e.key);
      if (idx === -1) return;
      const c = CURATED_REPOS[idx];
      if (c) {
        e.preventDefault();
        start(c);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [start]);

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <Mark trail={["type right away"]} />
        <h2 className="text-xl font-semibold tracking-tightish mb-1">
          Pick a codebase
        </h2>
        <p className="text-ink-300 text-sm mb-8">
          Three curated repos. Files are fetched from GitHub when you start.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CURATED_REPOS.map((c, i) => (
            <Panel key={c.id} className="flex flex-col">
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="text-lg font-semibold">{c.name}</h3>
                <Pill>{c.language}</Pill>
              </div>
              <p className="text-ink-300 text-sm leading-relaxed mb-3 min-h-[3em]">
                {c.blurb}
              </p>
              <p className="font-mono text-xs text-ink-400 mb-5">{c.repo}</p>
              <Button
                mono
                intent={i === 0 ? "primary" : "secondary"}
                onClick={() => start(c)}
                full
                data-testid={`curated-start-${c.id}`}
              >
                Start
                <span className="opacity-40 ml-2 text-2xs">{i + 1}</span>
              </Button>
            </Panel>
          ))}
        </div>

        <HotkeyHints
          className="mt-10"
          hints={[
            { keys: ["1"], label: CURATED_REPOS[0].name },
            { keys: ["2"], label: CURATED_REPOS[1].name },
            { keys: ["3"], label: CURATED_REPOS[2].name },
            { keys: ["Esc"], label: "back" },
          ]}
        />
      </div>
    </main>
  );
}
