import { Mark } from "./Mark";
import { Panel, Pill } from "./Panel";
import { Button } from "./Button";
import { useAppStore } from "@/state/useAppStore";

export function CustomHub() {
  const navigate = useAppStore((s) => s.navigate);

  const cards = [
    {
      tag: "01 · paste",
      title: "Paste config",
      desc: "Use a CodeType JSON config you already have.",
      cta: "Open editor",
      view: { name: "paste-config" as const },
      test: "custom-paste",
    },
    {
      tag: "02 · prompt",
      title: "Build config prompt",
      desc: "Generate a prompt for Claude, ChatGPT, or another LLM.",
      cta: "Build prompt",
      view: { name: "prompt-builder" as const },
      test: "custom-prompt",
    },
    {
      tag: "03 · repo",
      title: "Load any repo",
      desc: "Create a quick session from a public GitHub repo.",
      cta: "Load repo",
      view: { name: "load-any-repo" as const },
      test: "custom-load",
    },
  ];

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <Mark trail={["custom session"]} />
        <h2 className="text-xl font-semibold tracking-tightish mb-1">
          Custom session
        </h2>
        <p className="text-ink-300 text-sm mb-8">
          Three ways to build a guided typing session.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map((c) => (
            <Panel key={c.test} className="flex flex-col">
              <div className="mb-4">
                <Pill>{c.tag}</Pill>
              </div>
              <h3 className="text-lg font-semibold mb-2">{c.title}</h3>
              <p className="text-ink-300 text-sm leading-relaxed mb-6">
                {c.desc}
              </p>
              <Button
                mono
                onClick={() => navigate(c.view)}
                full
                data-testid={c.test}
              >
                {c.cta}
              </Button>
            </Panel>
          ))}
        </div>
      </div>
    </main>
  );
}
