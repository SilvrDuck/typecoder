import { Mark } from "./Mark";
import { LoadAnyRepoBody } from "./LoadAnyRepo";
import { PasteConfigBody } from "./PasteConfig";
import { PromptBuilderBody } from "./PromptBuilder";
import { HotkeyHints } from "./HotkeyHints";
import { useEscapeBack } from "@/hooks/useEscapeBack";
import { useAppStore } from "@/state/useAppStore";
import { parseRepoInput } from "@/core/github/parseRepoInput";

/**
 * Custom-session hub. One progressive page with three steps:
 *   1) Paste a repo and start typing right away (smart file pick).
 *   2) If you want a guided session, build a prompt for an LLM.
 *   3) Paste the config the LLM gave you back to start it.
 *
 * The repo entered in step 01 flows into the prompt builder in step 02.
 */
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
        <h2 className="text-xl font-semibold tracking-tightish mb-1">
          Custom session
        </h2>
        <p className="text-ink-300 text-sm mb-10 max-w-2xl">
          Paste a repo and start typing right away — or use the steps below to
          shape a more deliberate, guided session.
        </p>

        <Section
          eyebrow="01 · type right away"
          title="Paste a repo — we'll pick a sensible file"
          description="The fastest path. Drop in any public GitHub repo and CodeType auto-picks readable source files to type. No setup, no config."
        >
          <LoadAnyRepoBody />
        </Section>

        <OrDivider />

        <Section
          eyebrow="02 · want a guided session?"
          title="Generate a config prompt for an LLM"
          description="If you want to focus on a specific concept — tracing execution, learning the test suite, exploring the public API — generate a prompt to paste into Claude or ChatGPT. They'll produce a CodeType config tailored to your goal. CodeType itself never calls an LLM."
        >
          <PromptBuilderBody repoOverride={repoOverride} />
        </Section>

        <OrDivider />

        <Section
          eyebrow="03 · already have a config?"
          title="Paste a CodeType JSON config"
          description="Drop in the config the LLM gave you (or one you wrote yourself) to start the guided session."
        >
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

function OrDivider() {
  return (
    <div className="my-12 flex items-center gap-4">
      <div className="flex-1 border-t border-ink-700" />
      <span className="font-mono text-2xs uppercase tracking-wider text-ink-500">
        or
      </span>
      <div className="flex-1 border-t border-ink-700" />
    </div>
  );
}

function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="font-mono text-2xs uppercase tracking-wider text-ink-400 mb-2">
        {eyebrow}
      </p>
      <h3 className="text-base font-semibold mb-2 text-ink-100">{title}</h3>
      {description && (
        <p className="text-ink-300 text-sm mb-5 max-w-2xl leading-relaxed">
          {description}
        </p>
      )}
      {children}
    </section>
  );
}
