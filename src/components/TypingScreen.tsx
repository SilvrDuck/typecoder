import { useEffect, useState } from "react";
import { useAppStore } from "@/state/useAppStore";
import { TypingSurface } from "./TypingSurface";
import { TypingStats } from "./TypingStats";
import { CompletionCard } from "./CompletionCard";
import { FocusCard } from "./FocusCard";
import { Button } from "./Button";
import { Kbd } from "./Panel";

export function TypingScreen() {
  const session = useAppStore((s) => s.session);
  const setTypingState = useAppStore((s) => s.setTypingState);
  const advanceItem = useAppStore((s) => s.advanceItem);
  const restartCurrentItem = useAppStore((s) => s.restartCurrentItem);
  const navigate = useAppStore((s) => s.navigate);

  const [showFocusCard, setShowFocusCard] = useState(true);
  const [showCompletion, setShowCompletion] = useState(false);
  const [skipIntros, setSkipIntros] = useState(false);

  useEffect(() => {
    setShowCompletion(false);
    if (skipIntros) setShowFocusCard(false);
    else setShowFocusCard(true);
  }, [session?.cursor, skipIntros]);

  // Esc opens a minimal pause/menu (returns to landing).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        navigate({ name: "landing" });
      } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        restartCurrentItem();
        setShowCompletion(false);
      } else if (e.key === "Tab" && showCompletion) {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCompletion, restartCurrentItem, navigate]);

  if (!session) {
    return (
      <div className="min-h-screen grid place-items-center px-6">
        <p className="font-mono text-sm text-ink-400">No active session.</p>
      </div>
    );
  }

  const item = session.resolved.items[session.cursor];
  if (!item) return null;

  function handleComplete() {
    setShowCompletion(true);
  }

  function handleNext() {
    if (!session) return;
    advanceItem({
      target: item.text,
      state: session.typingState,
      label: item.label,
      path: item.path,
    });
  }

  function handleRestart() {
    restartCurrentItem();
    setShowCompletion(false);
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
            <span className="text-ink-400">{item.path}</span>
            {item.symbol && (
              <>
                <span className="text-ink-600 mx-2">·</span>
                <span className="text-ink-200">{item.symbol}</span>
              </>
            )}
          </div>
          <TypingStats
            state={session.typingState}
            progress={{
              current: session.cursor + 1,
              total: session.resolved.items.length,
            }}
          />
        </div>

        {showFocusCard && !skipIntros ? (
          <div className="grid place-items-center min-h-[40vh]">
            <FocusCard
              item={item}
              onStart={() => setShowFocusCard(false)}
              onSkipIntros={() => {
                setSkipIntros(true);
                setShowFocusCard(false);
              }}
            />
          </div>
        ) : showCompletion ? (
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
              <Kbd>⌘↵</Kbd> restart
            </span>
            <span>
              <Kbd>Esc</Kbd> menu
            </span>
          </div>
          <div className="flex gap-1">
            <Button intent="ghost" mono onClick={handleRestart} className="text-xs">
              Restart
            </Button>
            <Button
              intent="ghost"
              mono
              onClick={() => {
                if (confirm("Skip this snippet?")) handleNext();
              }}
              className="text-xs"
            >
              Skip
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
