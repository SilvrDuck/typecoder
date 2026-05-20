import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

type Intent = "primary" | "secondary" | "ghost";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  intent?: Intent;
  mono?: boolean;
  full?: boolean;
};

const BASE = "inline-flex items-center justify-center gap-2 rounded-sm px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed select-none";

const INTENT: Record<Intent, string> = {
  primary: "bg-accent text-ink-950 hover:bg-[#f1bd44]",
  secondary:
    "bg-ink-850 border border-ink-700 text-ink-100 hover:border-ink-500 hover:bg-ink-800",
  ghost: "text-ink-300 hover:text-ink-100",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { intent = "secondary", mono = false, full = false, className = "", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`${BASE} ${INTENT[intent]} ${mono ? "font-mono" : ""} ${full ? "w-full" : ""} ${className}`}
      {...rest}
    />
  );
});
