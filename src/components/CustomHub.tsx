import { useState } from "react";
import { Mark } from "./Mark";
import { Panel } from "./Panel";
import { LoadAnyRepoBody } from "./LoadAnyRepo";
import { PasteConfigBody } from "./PasteConfig";
import { PromptBuilderBody } from "./PromptBuilder";

/**
 * Custom-session hub. Single page with all three flows:
 *   1) Top: paste a GitHub repo URL → fetch + start a quick session.
 *   2) Middle: paste a CodeType JSON config → start a guided session.
 *   3) Bottom: a collapsible LLM prompt generator.
 *
 * No multi-page navigation — everything stays on one screen.
 */
export function CustomHub() {
  const [showBuilder, setShowBuilder] = useState(false);

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <Mark trail={["custom session"]} />
        <h2 className="text-xl font-semibold tracking-tightish mb-1">
          Custom session
        </h2>
        <p className="text-ink-300 text-sm mb-10 max-w-2xl">
          Type any public GitHub repo, or paste a guided CodeType config.
        </p>

        <Section
          eyebrow="01 · type any repo"
          title="Paste a GitHub repo URL or owner/repo"
        >
          <LoadAnyRepoBody />
        </Section>

        <div className="my-12 flex items-center gap-4">
          <div className="flex-1 border-t border-ink-700" />
          <span className="font-mono text-2xs uppercase tracking-wider text-ink-500">
            or
          </span>
          <div className="flex-1 border-t border-ink-700" />
        </div>

        <Section
          eyebrow="02 · paste config"
          title="Use a CodeType JSON config you already have"
        >
          <PasteConfigBody />
        </Section>

        <div className="mt-12">
          <button
            type="button"
            onClick={() => setShowBuilder((v) => !v)}
            data-testid="custom-builder-toggle"
            aria-expanded={showBuilder}
            className="font-mono text-2xs uppercase tracking-wider text-ink-400 hover:text-accent transition-colors flex items-center gap-2"
          >
            <span className="text-ink-500">
              {showBuilder ? "▾" : "▸"}
            </span>
            03 · need a config? generate one with an LLM
          </button>
          {showBuilder && (
            <Panel className="mt-4" data-testid="custom-builder-body">
              <p className="text-ink-300 text-sm mb-5 max-w-2xl">
                Generate a prompt you can paste into Claude, ChatGPT, or any
                LLM. CodeType itself never calls an LLM.
              </p>
              <PromptBuilderBody />
            </Panel>
          )}
        </div>
      </div>
    </main>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="font-mono text-2xs uppercase tracking-wider text-ink-400 mb-2">
        {eyebrow}
      </p>
      <h3 className="text-base font-semibold mb-5 text-ink-100">{title}</h3>
      {children}
    </section>
  );
}
