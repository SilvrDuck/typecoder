import type { ReactNode, HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  inset?: boolean;
  interactive?: boolean;
};

export function Panel({
  children,
  inset = false,
  interactive = false,
  className = "",
  ...rest
}: Props) {
  const base = inset
    ? "rounded-sm border border-ink-700 bg-ink-850 p-4"
    : "rounded-md border border-ink-700 bg-ink-900 p-6";
  const inter = interactive
    ? "hover:border-ink-500 transition-colors cursor-pointer"
    : "";
  return (
    <div className={`${base} ${inter} ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-ink-700 bg-ink-800 px-2 py-0.5 text-2xs font-mono uppercase tracking-wider text-ink-300">
      {children}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <div className="text-2xs font-mono uppercase tracking-wider text-ink-400 mb-2">
      {children}
    </div>
  );
}
