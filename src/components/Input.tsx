import { forwardRef } from "react";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const BASE =
  "w-full rounded-sm border border-ink-700 bg-ink-850 px-3 py-2 text-sm font-mono text-ink-100 placeholder:text-ink-500 focus:border-accent focus:outline-none disabled:opacity-50";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { error?: boolean }
>(function Input({ error = false, className = "", ...rest }, ref) {
  const cls = error ? "border-err focus:border-err" : "";
  return <input ref={ref} className={`${BASE} ${cls} ${className}`} {...rest} />;
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }
>(function Textarea({ error = false, className = "", ...rest }, ref) {
  const cls = error ? "border-err focus:border-err" : "";
  return (
    <textarea
      ref={ref}
      className={`${BASE} ${cls} min-h-[10rem] resize-vertical ${className}`}
      spellCheck={false}
      autoCorrect="off"
      autoCapitalize="off"
      {...rest}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className = "", ...rest }, ref) {
  return (
    <select
      ref={ref}
      className={`${BASE} appearance-none cursor-pointer ${className}`}
      {...rest}
    />
  );
});
