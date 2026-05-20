import { useCallback, useEffect, useState } from "react";
import { useAppStore } from "@/state/useAppStore";
import { TypingSurface } from "./TypingSurface";
import { TypingStats } from "./TypingStats";
import { CompletionCard } from "./CompletionCard";
import { Button } from "./Button";
import { Kbd, Panel } from "./Panel";
import { buildGithubFileHref } from "@/core/github/githubFileUrl";
import { buildShareUrlForCurrentSession } from "@/state/urlSync";
import { ThemeToggle } from "./ThemeToggle";

export function TypingScreen() {
  const session = useAppStore((s) => s.session);
  const setTypingState = useAppStore((s) => s.setTypingState);
  const advanceItem = useAppStore((s) => s.advanceItem);
  const goToPreviousItem = useAppStore((s) => s.goToPreviousItem);
  const restartCurrentItem = useAppStore((s) => s.restartCurrentItem);
  const navigate = useAppStore((s) => s.navigate);

  const [showCompletion, setShowCompletion] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    try {
      const url = buildShareUrlForCurrentSession();
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        window.prompt("Copy link:", url);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // No active session — button is disabled when this is true anyway.
    }
  }, []);

  useEffect(() => {
    setShowCompletion(false);
    setShowSkipConfirm(false);
  }, [session?.cursor]);

  const handleNext = useCallback(() => {
    const s = useAppStore.getState().session;
    if (!s) return;
    const cur = s.resolved.items[s.cursor];
    if (!cur) return;
    advanceItem({
      target: cur.text,
      state: s.typingState,
      label: cur.label,
      path: cur.path,
    });
  }, [advanceItem]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (showSkipConfirm) {
          setShowSkipConfirm(false);
          return;
        }
        navigate({ name: "landing" });
      } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        restartCurrentItem();
        setShowCompletion(false);
      } else if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        goToPreviousItem();
      } else if (e.key === "Tab" && showCompletion) {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    showCompletion,
    showSkipConfirm,
    restartCurrentItem,
    navigate,
    goToPreviousItem,
    handleNext,
  ]);

  if (!session) {
    return (
      <div className="min-h-screen grid place-items-center px-6">
        <p className="font-mono text-sm text-ink-400">No active session.</p>
      </div>
    );
  }

  const item = session.resolved.items[session.cursor];
  if (!item) return null;

  const ghHref = buildGithubFileHref({
    repo: session.resolved.repo,
    ref: session.resolved.ref,
    path: item.path,
    startLine: item.startLine,
    endLine: item.endLine,
  });

  function handleComplete() {
    setShowCompletion(true);
  }

  function handleRestart() {
    restartCurrentItem();
    setShowCompletion(false);
  }

  function confirmSkip() {
    setShowSkipConfirm(false);
    handleNext();
  }

  return (
    <main className="min-h-screen px-6 py-8 flex flex-col">
      <div className="max-w-5xl mx-auto w-full">
        <div className="flex justify-between items-center gap-6 mb-8 flex-wrap">
          <div className="font-mono text-xs">
            <button
              onClick={() => navigate({ name: "landing" })}
              className="text-accent hover:opacity-80"
              aria-label="Exit session"
            >
              ▶
            </button>{" "}
            <span className="text-ink-200">{session.source}</span>
            <span className="text-ink-600 mx-2">/</span>
            {ghHref ? (
              <a
                href={ghHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink-400 hover:text-accent transition-colors underline-offset-2 hover:underline"
                data-testid="typing-file-link"
                aria-label={`Open ${item.path} on GitHub`}
              >
                {item.path}
              </a>
            ) : (
              <span className="text-ink-400">{item.path}</span>
            )}
            {item.symbol && (
              <>
                <span className="text-ink-600 mx-2">·</span>
                <span className="text-ink-200">{item.symbol}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <TypingStats
              state={session.typingState}
              progress={{
                current: session.cursor + 1,
                total: session.resolved.items.length,
              }}
            />
            <ThemeToggle />
          </div>
        </div>

        {showCompletion ? (
          <div className="grid place-items-center min-h-[40vh]">
            <CompletionCard
              state={session.typingState}
              onNext={handleNext}
              onRestart={handleRestart}
              hasNext={session.cursor + 1 < session.resolved.items.length}
            />
          </div>
        ) : (
          <div className="rounded-md border border-ink-700 bg-ink-900 px-8 py-10">
            <TypingSurface
              state={session.typingState}
              onChange={setTypingState}
              onComplete={handleComplete}
            />
          </div>
        )}

        <div className="flex justify-between items-center gap-4 mt-8 font-mono text-2xs text-ink-400">
          <div className="flex gap-3 flex-wrap">
            <span>
              <Kbd>Tab</Kbd> next
            </span>
            <span>
              <Kbd>⇧Tab</Kbd> previous
            </span>
            <span>
              <Kbd>⌘↵</Kbd> restart
            </span>
            <span>
              <Kbd>Esc</Kbd> menu
            </span>
          </div>
          <div className="flex gap-1 items-center">
            <Button
              intent="ghost"
              mono
              onClick={handleShare}
              className="text-xs"
              data-testid="typing-share"
              aria-label="Share session link"
            >
              {copied ? "Copied!" : "Share"}
            </Button>
            <Button intent="ghost" mono onClick={handleRestart} className="text-xs">
              Restart
            </Button>
            <Button
              intent="ghost"
              mono
              onClick={() => setShowSkipConfirm(true)}
              className="text-xs"
              data-testid="typing-skip"
            >
              Skip
            </Button>
          </div>
        </div>

        {showSkipConfirm && (
          <div
            className="mt-6 grid place-items-center"
            data-testid="skip-confirm"
            role="alertdialog"
            aria-label="Skip snippet"
          >
            <Panel className="max-w-md w-full">
              <p className="text-ink-100 text-sm mb-5">
                Skip this snippet? Your in-progress typing will be discarded.
              </p>
              <div className="flex gap-2">
                <Button
                  intent="primary"
                  mono
                  onClick={confirmSkip}
                  data-testid="skip-confirm-yes"
                  autoFocus
                >
                  Skip
                </Button>
                <Button
                  mono
                  onClick={() => setShowSkipConfirm(false)}
                  data-testid="skip-confirm-no"
                >
                  Cancel
                </Button>
              </div>
            </Panel>
          </div>
        )}
      </div>
    </main>
  );
}
