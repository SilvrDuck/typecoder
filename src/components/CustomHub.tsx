import { Mark } from "./Mark";
import { LoadAnyRepoBody } from "./LoadAnyRepo";
import { PasteConfigBody } from "./PasteConfig";
import { PromptBuilderBody } from "./PromptBuilder";
import { HotkeyHints } from "./HotkeyHints";
import { useEscapeBack } from "@/hooks/useEscapeBack";
import { useAppStore } from "@/state/useAppStore";
import { parseRepoInput } from "@/core/github/parseRepoInput";

export function CustomHub() {
  useEscapeBack();
  const repoInput = useAppStore((s) => s.loadAnyRepo.input);
  const parsed = parseRepoInput(repoInput);
  const repoOverride = parsed
    ? { repo: `${parsed.owner}/${parsed.repo}`, ref: parsed.ref }
    : { repo: "", ref: undefined };

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <Mark trail={["custom session"]} />
        <h2 className="text-xl font-semibold tracking-tightish mb-10">
          Custom session
        </h2>

        <Section heading="01 · type right away">
          <LoadAnyRepoBody />
          <p className="font-mono text-2xs uppercase tracking-wider text-ink-500 mt-4">
            or, for a guided session ↓
          </p>
        </Section>

        <Section heading="02 · build a config with an LLM" className="mt-12">
          <PromptBuilderBody repoOverride={repoOverride} />
        </Section>

        <Section heading="03 · paste a config" className="mt-12">
          <PasteConfigBody />
        </Section>

        <HotkeyHints
          className="mt-10"
          hints={[{ keys: ["Esc"], label: "back" }]}
        />
      </div>
    </main>
  );
}

function Section({
  heading,
  className,
  children,
}: {
  heading: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={className}>
      <p className="font-mono text-2xs uppercase tracking-wider text-ink-400 mb-4">
        {heading}
      </p>
      {children}
    </section>
  );
}
