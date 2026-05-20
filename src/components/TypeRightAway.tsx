import { Mark } from "./Mark";
import { Panel, Pill } from "./Panel";
import { Button } from "./Button";
import { CURATED_REPOS, type CuratedRepo } from "@/core/config/curated";
import { useAppStore } from "@/state/useAppStore";

export function TypeRightAway() {
  const pickCurated = useAppStore((s) => s.pickCurated);
  const navigate = useAppStore((s) => s.navigate);

  function start(c: CuratedRepo) {
    pickCurated(c);
    navigate({ name: "loading", title: c.config.title });
  }

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
              </Button>
            </Panel>
          ))}
        </div>
      </div>
    </main>
  );
}
