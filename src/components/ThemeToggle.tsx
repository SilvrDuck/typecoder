import { useAppStore } from "@/state/useAppStore";

/**
 * Compact icon toggle. Sun for light, moon for dark; the icon shown is
 * the theme the user will move TO when clicked, matching how OS-level
 * toggles work.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useAppStore((s) => s.theme);
  const toggle = useAppStore((s) => s.toggleTheme);
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      data-testid="theme-toggle"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode (${next === "dark" ? "🌙" : "☀"})`}
      className={`inline-flex items-center justify-center w-7 h-7 rounded-md border border-ink-700 bg-ink-900 text-ink-300 hover:text-accent hover:border-accent/40 transition-colors ${className}`}
    >
      {theme === "dark" ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}

function MoonIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M13 9.5a5 5 0 1 1-6.5-6.5 5.5 5.5 0 0 0 6.5 6.5z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8h1.5M13 8h1.5M3.3 3.3l1 1M11.7 11.7l1 1M3.3 12.7l1-1M11.7 4.3l1-1" />
    </svg>
  );
}
