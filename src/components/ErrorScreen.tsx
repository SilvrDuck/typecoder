import { Mark } from "./Mark";
import { Panel } from "./Panel";
import { Button } from "./Button";
import { useAppStore } from "@/state/useAppStore";

export function ErrorScreen({ title, detail }: { title: string; detail?: string }) {
  const navigate = useAppStore((s) => s.navigate);
  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-xl mx-auto">
        <Mark trail={["error"]} />
        <Panel>
          <div className="flex gap-4 items-start">
            <div className="font-mono text-warn text-xl leading-none mt-0.5">!</div>
            <div className="flex-1">
              <h3 className="text-base font-semibold mb-1">{title}</h3>
              {detail && (
                <p className="text-ink-300 text-sm leading-relaxed mb-5">
                  {detail}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  intent="primary"
                  mono
                  onClick={() => navigate({ name: "type-right-away" })}
                >
                  Pick curated
                </Button>
                <Button
                  intent="ghost"
                  mono
                  onClick={() => navigate({ name: "landing" })}
                >
                  Home
                </Button>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </main>
  );
}
