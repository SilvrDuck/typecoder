import { useAppStore } from "@/state/useAppStore";

/**
 * The `▶ CodeType / breadcrumb` mark used on every non-landing screen.
 * Clicking it returns the user to landing.
 */
export function Mark({ trail }: { trail?: string[] }) {
  const navigate = useAppStore((s) => s.navigate);
  return (
    <header className="mb-12">
      <button
        onClick={() => navigate({ name: "landing" })}
        className="font-mono text-xs tracking-tightish text-ink-300 hover:text-ink-100 transition-colors"
        aria-label="Go to landing"
      >
        <span className="text-accent">▶</span> CodeType
        {trail?.map((seg) => (
          <span key={seg} className="text-ink-500">
            {" "}
            / <span className="text-ink-400">{seg}</span>
          </span>
        ))}
      </button>
    </header>
  );
}
