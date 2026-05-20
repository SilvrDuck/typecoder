import { Mark } from "./Mark";
import { Panel } from "./Panel";
import { Button } from "./Button";
import { useAppStore } from "@/state/useAppStore";

export function ErrorScreen({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  const navigate = useAppStore((s) => s.navigate);
  // Pick severity glyph color: rate_limit / network = warn; otherwise err.
  const isFatal =
    /not found|empty|invalid|symbol|path missing|forbade|forbidden/i.test(title);
  const glyphColor = isFatal ? "text-err" : "text-warn";
  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-xl mx-auto">
        <Mark trail={["error"]} />
        <Panel data-testid="error-screen">
          <div className="flex gap-4 items-start">
            <div
              className={`font-mono ${glyphColor} text-xl leading-none mt-0.5`}
              aria-hidden="true"
            >
              !
            </div>
            <div className="flex-1">
              <h3
                className="text-base font-semibold mb-1"
                data-testid="error-title"
              >
                {title}
              </h3>
              {detail && (
                <p
                  className="text-ink-300 text-sm leading-relaxed mb-5"
                  data-testid="error-detail"
                >
                  {detail}
                </p>
              )}
              <div className="flex gap-2 flex-wrap">
                <Button
                  intent="primary"
                  mono
                  onClick={() => navigate({ name: "type-right-away" })}
                >
                  Pick curated
                </Button>
                <Button
                  intent="ghost"
                  mono
                  onClick={() => navigate({ name: "landing" })}
                >
                  Home
                </Button>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </main>
  );
}
