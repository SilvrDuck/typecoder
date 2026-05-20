import { useMemo, useState } from "react";
import { Mark } from "./Mark";
import { Panel, Label } from "./Panel";
import { Button } from "./Button";
import { Input, Select } from "./Input";
import { useAppStore } from "@/state/useAppStore";
import {
  PROMPT_TEMPLATES,
  buildPrompt,
  getTemplate,
  PROMPT_SCHEMA_TEXT,
  type PromptTemplateId,
} from "@/core/config/promptTemplates";

export function PromptBuilder() {
  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <Mark trail={["custom", "build config prompt"]} />
        <h2 className="text-xl font-semibold tracking-tightish mb-1">
          Build config prompt
        </h2>
        <p className="text-ink-300 text-sm mb-8 max-w-2xl">
          Generate a prompt you can paste into Claude, ChatGPT, or any LLM.
          CodeType itself never calls an LLM.
        </p>
        <PromptBuilderBody />
      </div>
    </main>
  );
}

export function PromptBuilderBody() {
  const draft = useAppStore((s) => s.promptBuilder);
  const setDraft = useAppStore((s) => s.setPromptBuilder);
  const [copied, setCopied] = useState<"" | "prompt" | "schema">("");

  const template = useMemo(
    () => getTemplate(draft.templateId as PromptTemplateId),
    [draft.templateId],
  );

  const prompt = useMemo(
    () =>
      buildPrompt({
        repo: draft.repo.trim() || "owner/repo",
        ref: draft.ref.trim() || undefined,
        templateId: draft.templateId as PromptTemplateId,
        customFocus: draft.customFocus,
      }),
    [draft],
  );

  async function copyText(text: string, label: "prompt" | "schema") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      // Clipboard may be unavailable (e.g. some Playwright contexts).
      // Fall back to a selection on a hidden element.
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(label);
        setTimeout(() => setCopied(""), 1500);
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  return (
    <>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-6">
          {/* Controls */}
          <Panel>
            <div className="mb-5">
              <Label>Repository</Label>
              <Input
                placeholder="owner/repo"
                value={draft.repo}
                onChange={(e) => setDraft({ repo: e.target.value })}
                data-testid="pb-repo"
              />
            </div>
            <div className="mb-5">
              <Label>Ref (optional)</Label>
              <Input
                placeholder="main"
                value={draft.ref}
                onChange={(e) => setDraft({ ref: e.target.value })}
                data-testid="pb-ref"
              />
            </div>
            <div className="mb-5">
              <Label>Goal</Label>
              <Select
                value={draft.templateId}
                onChange={(e) => setDraft({ templateId: e.target.value })}
                data-testid="pb-template"
              >
                {PROMPT_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
            {draft.templateId === "custom" && (
              <div className="mb-5" data-testid="pb-custom-focus-row">
                <Label>Custom focus</Label>
                <Input
                  placeholder="e.g. understand plugin loading and lifecycle"
                  value={draft.customFocus}
                  onChange={(e) => setDraft({ customFocus: e.target.value })}
                  data-testid="pb-custom-focus"
                />
              </div>
            )}

            <Panel inset className="mb-4">
              <Label>Best for</Label>
              <p
                className="text-ink-200 text-sm leading-relaxed"
                data-testid="pb-best-for"
              >
                {template.bestFor}
              </p>
            </Panel>

            <Panel inset>
              <Label>This prompt will ask the LLM to</Label>
              <ul
                className="font-mono text-xs text-ink-200 space-y-1 list-disc list-inside marker:text-ink-500"
                data-testid="pb-bullets"
              >
                {template.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </Panel>
          </Panel>

          {/* Preview */}
          <Panel className="flex flex-col p-0">
            <div className="flex justify-between items-center px-6 py-3 border-b border-ink-700">
              <Label>
                <span className="m-0">Generated prompt</span>
              </Label>
              <div className="flex gap-2 -mt-2">
                <Button
                  intent="ghost"
                  mono
                  onClick={() => copyText(PROMPT_SCHEMA_TEXT, "schema")}
                  className="text-xs px-2 py-1"
                  data-testid="pb-copy-schema"
                >
                  {copied === "schema" ? "Copied ✓" : "Copy schema"}
                </Button>
                <Button
                  intent="primary"
                  mono
                  onClick={() => copyText(prompt, "prompt")}
                  className="text-xs px-2 py-1"
                  data-testid="pb-copy-prompt"
                >
                  {copied === "prompt" ? "Copied ✓" : "Copy prompt"}
                </Button>
                <Button
                  intent="ghost"
                  mono
                  onClick={() =>
                    setDraft({ repo: "", ref: "main", customFocus: "" })
                  }
                  className="text-xs px-2 py-1"
                  data-testid="pb-clear"
                >
                  Clear
                </Button>
              </div>
            </div>
            <pre
              className="font-mono text-xs text-ink-200 leading-relaxed px-6 py-5 m-0 overflow-auto max-h-[60vh] whitespace-pre-wrap"
              data-testid="pb-preview"
            >
              {prompt}
            </pre>
          </Panel>
        </div>
    </>
  );
}
