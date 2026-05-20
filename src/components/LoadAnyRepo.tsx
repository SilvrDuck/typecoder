import { useState } from "react";
import { Mark } from "./Mark";
import { Panel, Label, Pill } from "./Panel";
import { Button } from "./Button";
import { Input } from "./Input";
import { useAppStore } from "@/state/useAppStore";
import { parseRepoInput } from "@/core/github/parseRepoInput";
import { getGithubClient } from "@/core/session/sessionStarter";
import {
  buildSuggestedSession,
  type Difficulty,
  type SessionLength,
} from "@/core/github/suggestedSession";
import { startCuratedSession } from "@/core/session/sessionStarter";
import { languageOf } from "@/core/github/fileFilters";
import type { TreeEntry } from "@/core/github/githubClient";

type LoadedState = {
  owner: string;
  repo: string;
  ref: string;
  entries: TreeEntry[];
  truncated: boolean;
};

export function LoadAnyRepo() {
  const draft = useAppStore((s) => s.loadAnyRepo);
  const setDraft = useAppStore((s) => s.setLoadAnyRepo);
  const [parseError, setParseError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState<LoadedState | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [customizing, setCustomizing] = useState(false);
  const [length, setLength] = useState<SessionLength>("medium");
  const [difficulty, setDifficulty] = useState<Difficulty>("realistic");

  async function loadRepo() {
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
      setLoaded({
        owner: parsed.owner,
        repo: parsed.repo,
        ref,
        entries: tree.value.entries,
        truncated: tree.value.truncated,
      });
    } finally {
      setBusy(false);
    }
  }

  function startSession() {
    if (!loaded) return;
    const suggested = buildSuggestedSession(loaded.entries, {
      length,
      difficulty,
    });
    if (suggested.files.length === 0) {
      setFetchError("No usable source files found in this repo.");
      return;
    }
    void startCuratedSession(
      {
        version: 1,
        repo: `${loaded.owner}/${loaded.repo}`,
        ref: loaded.ref,
        title: `${loaded.owner}/${loaded.repo} — quick session`,
        description: `${suggested.estimatedSnippets} files · ${suggested.language ?? "mixed"} · ${difficulty} difficulty`,
        items: suggested.files.map((f) => ({
          level: "file" as const,
          path: f.path,
          label: f.path.split("/").pop() ?? f.path,
        })),
      },
      `${loaded.owner}/${loaded.repo}@${loaded.ref}`,
    );
  }

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <Mark trail={["custom", "load any repo"]} />
        <h2 className="text-xl font-semibold tracking-tightish mb-1">
          Load any repo
        </h2>
        <p className="text-ink-300 text-sm mb-8">
          Paste a GitHub URL or owner/repo. Files are fetched from GitHub in
          your browser only.
        </p>

        <Panel className="mb-6">
          <Label>Repository</Label>
          <div className="flex gap-2">
            <Input
              placeholder="github.com/vitejs/vite"
              value={draft.input}
              onChange={(e) => setDraft({ input: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") void loadRepo();
              }}
              error={!!parseError}
              data-testid="lar-input"
            />
            <Button
              intent="primary"
              mono
              onClick={loadRepo}
              disabled={busy}
              data-testid="lar-load"
            >
              {busy ? "Loading…" : "Load"}
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
          <Panel className="mb-6 border-err" data-testid="lar-fetch-error">
            <div className="flex gap-3 items-start">
              <span className="text-warn font-mono text-lg leading-none">!</span>
              <p className="text-ink-200 text-sm">{fetchError}</p>
            </div>
          </Panel>
        )}

        {loaded && (
          <Panel data-testid="lar-loaded">
            <p className="font-mono text-sm text-ink-100 mb-1">
              {loaded.owner}/{loaded.repo}{" "}
              <span className="text-ink-400 ml-2">{loaded.ref}</span>
            </p>
            <p className="text-ink-400 text-sm mb-5">
              {loaded.entries.length.toLocaleString()} entries
              {loaded.truncated && (
                <span className="text-warn ml-2">· tree truncated</span>
              )}
            </p>

            <SuggestionPreview
              entries={loaded.entries}
              length={length}
              difficulty={difficulty}
            />

            <div className="flex flex-wrap gap-2 mt-6">
              <Button
                intent="primary"
                mono
                onClick={startSession}
                data-testid="lar-start"
              >
                Start typing
              </Button>
              <Button
                mono
                onClick={() => setCustomizing((c) => !c)}
                data-testid="lar-customize"
              >
                {customizing ? "Hide options" : "Customize"}
              </Button>
            </div>

            {customizing && (
              <div
                className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6 pt-6 border-t border-ink-700"
                data-testid="lar-options"
              >
                <div>
                  <Label>Length</Label>
                  <div className="flex gap-1">
                    {(["short", "medium", "long"] as const).map((opt) => (
                      <Button
                        key={opt}
                        mono
                        intent={length === opt ? "primary" : "secondary"}
                        onClick={() => setLength(opt)}
                        className="text-xs"
                      >
                        {opt}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Difficulty</Label>
                  <div className="flex gap-1">
                    {(["readable", "realistic", "brutal"] as const).map(
                      (opt) => (
                        <Button
                          key={opt}
                          mono
                          intent={difficulty === opt ? "primary" : "secondary"}
                          onClick={() => setDifficulty(opt)}
                          className="text-xs"
                        >
                          {opt}
                        </Button>
                      ),
                    )}
                  </div>
                </div>
              </div>
            )}
          </Panel>
        )}
      </div>
    </main>
  );
}

function SuggestionPreview({
  entries,
  length,
  difficulty,
}: {
  entries: TreeEntry[];
  length: SessionLength;
  difficulty: Difficulty;
}) {
  const suggested = buildSuggestedSession(entries, { length, difficulty });
  const lang = suggested.language ?? "mixed";
  return (
    <div data-testid="lar-suggested">
      <p className="font-mono text-2xs text-ink-400 tracking-wider uppercase mb-2">
        Suggested session
      </p>
      <p className="text-sm text-ink-200 mb-3">
        {suggested.estimatedSnippets} snippets <Pill>{lang}</Pill>{" "}
        <Pill>{difficulty}</Pill>
      </p>
      <ul className="font-mono text-xs text-ink-300 space-y-1 max-h-32 overflow-auto">
        {suggested.files.slice(0, 8).map((f) => (
          <li key={f.path}>
            <span className="text-ink-100">
              {f.path.split("/").pop() ?? f.path}
            </span>{" "}
            <span className="text-ink-500">· {languageOf(f.path) ?? "?"}</span>
          </li>
        ))}
        {suggested.files.length > 8 && (
          <li className="text-ink-500">
            … and {suggested.files.length - 8} more
          </li>
        )}
      </ul>
    </div>
  );
}
