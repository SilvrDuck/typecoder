import { useState } from "react";
import { Mark } from "./Mark";
import { Panel, Label } from "./Panel";
import { Button } from "./Button";
import { Input } from "./Input";
import { useAppStore } from "@/state/useAppStore";
import { parseRepoInput } from "@/core/github/parseRepoInput";
import { getGithubClient } from "@/core/session/sessionStarter";
import { buildSuggestedSession } from "@/core/github/suggestedSession";
import { startCuratedSession } from "@/core/session/sessionStarter";

export function LoadAnyRepo() {
  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <Mark trail={["custom", "load any repo"]} />
        <LoadAnyRepoBody />
      </div>
    </main>
  );
}

export function LoadAnyRepoBody() {
  const draft = useAppStore((s) => s.loadAnyRepo);
  const setDraft = useAppStore((s) => s.setLoadAnyRepo);
  const [parseError, setParseError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  async function startWithRandomFile() {
    setParseError(null);
    setFetchError(null);
    const parsed = parseRepoInput(draft.input);
    if (!parsed) {
      setParseError("That doesn't look like a GitHub repository.");
      return;
    }
    setBusy(true);
    try {
      const client = getGithubClient();
      const meta = await client.fetchRepoMeta(parsed.owner, parsed.repo);
      if (!meta.ok) {
        setFetchError(meta.error.message);
        return;
      }
      const ref = parsed.ref ?? meta.value.defaultBranch;
      const tree = await client.fetchRepoTree(parsed.owner, parsed.repo, ref);
      if (!tree.ok) {
        setFetchError(tree.error.message);
        return;
      }
      const suggested = buildSuggestedSession(tree.value.entries, {
        length: "short",
        difficulty: "realistic",
      });
      const top = suggested.files.slice(0, 5);
      const pick = top[Math.floor(Math.random() * top.length)];
      if (!pick) {
        setFetchError("No usable source files found in this repo.");
        return;
      }
      void startCuratedSession(
        {
          version: 1,
          repo: `${parsed.owner}/${parsed.repo}`,
          ref,
          title: `${parsed.owner}/${parsed.repo} — ${pick.path.split("/").pop() ?? pick.path}`,
          items: [
            {
              level: "file" as const,
              path: pick.path,
              label: pick.path.split("/").pop() ?? pick.path,
            },
          ],
        },
        `${parsed.owner}/${parsed.repo}@${ref}`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Panel className="mb-4">
        <Label>Repository</Label>
        <div className="flex gap-2">
          <Input
            placeholder="github.com/vitejs/vite"
            value={draft.input}
            onChange={(e) => setDraft({ input: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") void startWithRandomFile();
            }}
            error={!!parseError}
            data-testid="lar-input"
          />
          <Button
            intent="primary"
            mono
            onClick={startWithRandomFile}
            disabled={busy}
            data-testid="lar-load"
          >
            {busy ? "Starting…" : "Start with random file"}
          </Button>
        </div>
        {parseError && (
          <p
            className="text-err text-xs font-mono mt-2"
            data-testid="lar-parse-error"
          >
            {parseError}
          </p>
        )}
      </Panel>

      {fetchError && (
        <Panel className="border-err" data-testid="lar-fetch-error">
          <div className="flex gap-3 items-start">
            <span className="text-warn font-mono text-lg leading-none">!</span>
            <p className="text-ink-200 text-sm">{fetchError}</p>
          </div>
        </Panel>
      )}
    </>
  );
}
