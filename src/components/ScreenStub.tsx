import { Mark } from "./Mark";
import { Button } from "./Button";
import { useAppStore } from "@/state/useAppStore";

/**
 * Temporary placeholder rendered by routes whose UI ships in a later
 * slice. Keeps the app navigable for Playwright while leaving a clear
 * "coming next" message.
 */
export function ScreenStub({
  title,
  trail,
}: {
  title: string;
  trail: string[];
}) {
  const back = useAppStore((s) => s.back);
  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <Mark trail={trail} />
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        <p className="text-ink-300 text-sm mb-8">Coming in the next slice.</p>
        <Button mono onClick={back}>
          Back
        </Button>
      </div>
    </main>
  );
}
