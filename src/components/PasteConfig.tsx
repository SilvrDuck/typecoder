import { useMemo } from "react";
import { Mark } from "./Mark";
import { Panel, Label } from "./Panel";
import { Button } from "./Button";
import { Textarea } from "./Input";
import { useAppStore } from "@/state/useAppStore";
import {
  validateConfigText,
  summarizeItems,
  describeItem,
} from "@/core/config/schema";
import { startCuratedSession } from "@/core/session/sessionStarter";

export function PasteConfig() {
  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <Mark trail={["custom", "paste config"]} />
        <h2 className="text-xl font-semibold tracking-tightish mb-1">
          Paste config
        </h2>
        <p className="text-ink-300 text-sm mb-8 max-w-2xl">
          Paste a CodeType JSON config. We'll validate it, show a preview,
          then fetch the source files from GitHub in your browser when you
          start the session.
        </p>
        <PasteConfigBody />
      </div>
    </main>
  );
}

export function PasteConfigBody() {
  const text = useAppStore((s) => s.pastedConfigText);
  const setText = useAppStore((s) => s.setPastedConfigText);

  const result = useMemo(() => {
    if (!text.trim()) return { kind: "empty" as const };
    const r = validateConfigText(text);
    return { kind: "validated" as const, r };
  }, [text]);

  const validated = result.kind === "validated" ? result.r : undefined;
  const summary = useMemo(
    () => (validated?.ok ? summarizeItems(validated.value.items) : null),
    [validated],
  );

  function start() {
    if (!validated?.ok) return;
    void startCuratedSession(
      validated.value,
      `${validated.value.repo}@${validated.value.ref ?? "main"}`,
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Panel className="p-0">
            <div className="px-5 py-3 border-b border-ink-700">
              <Label>config.json</Label>
            </div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder='{\n  "version": 1,\n  "repo": "owner/repo",\n  ...\n}'
              className="border-0 rounded-none min-h-[26rem] font-mono text-xs"
              data-testid="paste-textarea"
              error={validated?.ok === false}
              aria-invalid={validated?.ok === false}
              aria-describedby="paste-errors"
            />
          </Panel>

          <Panel>
            <Label>Preview</Label>
            {result.kind === "empty" && (
              <p
                className="text-ink-400 text-sm leading-relaxed mt-1"
                data-testid="paste-empty"
              >
                Paste a config to see the preview.
              </p>
            )}
            {validated?.ok === false && (
              <div
                id="paste-errors"
                aria-live="polite"
                className="mt-1"
                data-testid="paste-errors"
              >
                {validated.parseError && (
                  <div className="font-mono text-xs text-err mb-3">
                    {validated.parseError}
                  </div>
                )}
                <ul className="font-mono text-xs text-err space-y-1">
                  {validated.errors.map((e, i) => (
                    <li key={i}>
                      <span className="text-ink-400">{e.path.join(".")}</span>{" "}
                      <span className="text-err">{e.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {validated?.ok && summary && (
              <div data-testid="paste-preview">
                <h3 className="text-base font-semibold mt-2 mb-1">
                  {validated.value.title}
                </h3>
                {validated.value.description && (
                  <p className="text-ink-400 text-sm mb-5 leading-relaxed">
                    {validated.value.description}
                  </p>
                )}
                <div className="font-mono text-2xs text-ink-400 mb-6 flex flex-wrap gap-x-6 gap-y-1 uppercase tracking-wider">
                  <span>
                    <span className="text-ink-100 text-xs">{summary.total}</span>{" "}
                    items
                  </span>
                  <span>
                    <span className="text-ink-100 text-xs">
                      {summary.functions}
                    </span>{" "}
                    functions
                  </span>
                  <span>
                    <span className="text-ink-100 text-xs">{summary.files}</span>{" "}
                    files
                  </span>
                  <span>
                    <span className="text-ink-100 text-xs">
                      {summary.classes}
                    </span>{" "}
                    classes
                  </span>
                </div>
                <ol className="mb-6 list-none p-0 max-h-[18rem] overflow-auto">
                  {validated.value.items.map((it, i) => (
                    <li
                      key={i}
                      className="font-mono text-xs flex gap-3 py-2 border-b border-ink-700 last:border-b-0"
                    >
                      <span className="text-ink-500 w-6">{i + 1}</span>
                      <span className="text-ink-100">{it.label}</span>
                      <span className="ml-auto text-ink-400">
                        {describeItem(it)}
                      </span>
                    </li>
                  ))}
                </ol>
                <Button
                  intent="primary"
                  mono
                  onClick={start}
                  full
                  data-testid="paste-start"
                >
                  Start guided session
                </Button>
              </div>
            )}
          </Panel>
        </div>
    </>
  );
}
