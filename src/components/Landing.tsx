import { useEffect } from "react";
import { useAppStore } from "@/state/useAppStore";
import { Button } from "./Button";
import { Footer } from "./Footer";
import { ThemeToggle } from "./ThemeToggle";

export function Landing() {
  const navigate = useAppStore((s) => s.navigate);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        navigate({ name: "type-right-away" });
      } else if ((e.key === "c" || e.key === "C") && !e.metaKey && !e.ctrlKey) {
        if (document.activeElement?.tagName !== "INPUT") {
          navigate({ name: "custom-hub" });
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  return (
    <main className="min-h-screen grid place-items-center px-6">
      <div className="max-w-xl w-full">
        <header className="mb-16 flex items-center justify-between gap-4">
          <h1 className="font-mono text-xs tracking-tightish text-ink-300">
            <span className="text-accent">▶</span> CodeType
          </h1>
          <ThemeToggle />
        </header>

        <p className="font-sans text-3xl md:text-4xl leading-tight tracking-tightish text-ink-100">
          Type real code.
        </p>
        <p className="font-sans text-3xl md:text-4xl leading-tight tracking-tightish text-ink-400 mt-1">
          Understand real codebases.
        </p>

        <div className="mt-12 flex flex-wrap gap-3">
          <Button
            intent="primary"
            mono
            onClick={() => navigate({ name: "type-right-away" })}
            data-testid="landing-type-right-away"
          >
            Type right away
            <span className="opacity-60 text-2xs">↵</span>
          </Button>
          <Button
            mono
            onClick={() => navigate({ name: "custom-hub" })}
            data-testid="landing-custom"
          >
            Custom
            <span className="opacity-40 text-2xs">C</span>
          </Button>
        </div>

        <div className="mt-24 border-t border-ink-700 pt-6 space-y-2">
          <p className="font-mono text-2xs text-ink-500 tracking-wider leading-relaxed">
            no backend · no auth · no telemetry · public repos only ·{" "}
            <span className="text-ink-400">
              all GitHub requests happen in your browser
            </span>
          </p>
          <Footer />
        </div>
      </div>
    </main>
  );
}
