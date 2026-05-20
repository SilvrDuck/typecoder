import { useEffect } from "react";
import { Mark } from "./Mark";
import { Panel } from "./Panel";
import { useAppStore } from "@/state/useAppStore";

export function LoadingScreen({ title }: { title: string }) {
  const navigate = useAppStore((s) => s.navigate);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        navigate({ name: "landing" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);
  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-xl mx-auto">
        <Mark trail={["resolving session"]} />
        <Panel className="px-7 py-7">
          <h3 className="text-lg font-semibold mb-1">{title}</h3>
          <p className="text-ink-300 text-sm mb-5">
            Fetching files from GitHub in your browser…
          </p>
          <div className="flex items-center gap-2 font-mono text-sm text-ink-200">
            <span
              className="inline-block animate-spin text-accent"
              aria-hidden="true"
            >
              ◐
            </span>
            <span>Resolving session items…</span>
          </div>
        </Panel>
        <p className="font-mono text-2xs text-ink-500 mt-4 tracking-wider">
          requests go directly from your browser to github.com · esc to cancel
        </p>
      </div>
    </main>
  );
}
