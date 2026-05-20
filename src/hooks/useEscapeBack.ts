import { useEffect } from "react";
import { useAppStore } from "@/state/useAppStore";

/**
 * Esc returns to landing from any non-typing screen. We don't wire it
 * inside text inputs (where Esc would otherwise blur or do nothing —
 * we want it to still navigate, since CodeType is a keyboard-first app
 * and a sticky Esc is the consistent contract).
 *
 * Optionally pass `enabled = false` to opt out (e.g. typing screen
 * uses its own Esc handler for menu/skip-confirm logic).
 */
export function useEscapeBack(enabled = true) {
  const navigate = useAppStore((s) => s.navigate);
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        navigate({ name: "landing" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled, navigate]);
}
