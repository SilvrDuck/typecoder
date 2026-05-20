# CodeType — design system

Dark-first, monospace-led, low-chrome. One accent.

## Color tokens

All Tailwind tokens live in `tailwind.config.ts`.

| Token | Hex | Purpose |
|---|---|---|
| `ink-950` | `#08090b` | Surface (page background). |
| `ink-900` | `#0c0d10` | Panel background. |
| `ink-850` | `#101216` | Inset (code blocks, inputs, JSON previews). |
| `ink-800` | `#14171c` | Hover state for panels, `kbd` chips. |
| `ink-700` | `#1c2026` | 1px borders, rules. |
| `ink-600` | `#262b33` | Subtle dividers inside panels. |
| `ink-500` | `#3a4049` | Disabled text on dark surfaces. |
| `ink-400` | `#5b6471` | Tertiary text (subtitles, metadata). |
| `ink-300` | `#8a92a0` | Secondary text. |
| `ink-200` | `#b6bcc6` | Body text default. |
| `ink-100` | `#dcdfe5` | Primary text / typing surface foreground. |
| `ink-50`  | `#f0f2f5` | Pure white-equivalent. Rare. |
| `accent`  | `#f5c451` | Single accent — caret, current item, brand mark. |
| `accent/soft` | `#f5c45122` | Background tint for current-item pill. |
| `ok`      | `#7fb685` | Correct character. |
| `warn`    | `#e3a857` | Soft warning. |
| `err`     | `#e07a7a` | Incorrect character + error state. |

Rules:
- Never combine `accent` with another saturated color. Never gradient.
- Errors use `err` only as text/underline; never fill a card.

## Type scale

Two families. Mono leads.

| Size | Use | Family |
|---|---|---|
| `text-2xs` (11px) | Pills, kbd, metadata, file path crumbs. | mono |
| `text-xs` (12px) | Mono UI labels, status counters. | mono |
| `text-sm` (14px) | Body, secondary UI, input text. | sans |
| `text-base` (16px) | Typing surface default. | mono |
| `text-lg` (18px) | Panel titles. | sans |
| `text-xl` / `text-2xl` | Card titles. | sans |
| `text-3xl` (30px) | Landing tagline. | sans |
| `text-5xl` (48px) | Session summary headline numbers. | mono |

Tracking: `tracking-tightish` (-0.01em) on display sizes.

## Spacing

`p-6`, `p-8` for panels. `gap-3`, `gap-4` between related controls. `gap-8`, `gap-12` between sections. Avoid `p-10`/`p-12` ceremonial padding.

## Layout primitives

- **Panel** — `rounded-md border border-ink-700 bg-ink-900 p-6`
- **Inset** — `rounded-sm border border-ink-700 bg-ink-850 p-4`
- **Pill** — `inline-flex items-center gap-1 rounded-sm border border-ink-700 bg-ink-800 px-2 py-0.5 text-2xs font-mono uppercase tracking-wider text-ink-300`
- **Rule** — `border-t border-ink-700`

## Buttons

Three intents only.

- **Primary**: `bg-accent text-ink-950 hover:bg-accent/90` (used sparingly — one per screen).
- **Secondary**: `border border-ink-700 bg-ink-850 text-ink-100 hover:border-ink-500`.
- **Ghost**: `text-ink-300 hover:text-ink-100`.

All buttons: `rounded-sm px-3 py-1.5 text-sm font-medium`. Mono on stat actions, sans on prose actions.

## Inputs

`rounded-sm border border-ink-700 bg-ink-850 px-3 py-2 text-sm font-mono text-ink-100 placeholder:text-ink-400 focus:border-accent`.

Errors: `border-err text-err`.

## Typing surface

- Container: `rounded-md bg-ink-900 border border-ink-700 px-8 py-10 font-mono text-base leading-7`.
- Foreground (target text not yet typed): `text-ink-500`.
- Correctly typed: `text-ink-100`.
- Wrong: `text-err underline decoration-err/40`.
- Current char: `bg-accent/15 text-ink-50` with a 1px-wide accent block caret using `animate-caret`.
- Whitespace glyphs (`·` for space, `→` for tab, `↵` for newline) appear in `rgba(255,255,255,0.16)` only on mistyped whitespace or hover-debug — they should not flicker during normal typing.
- Long lines wrap softly at 72ch but keep a horizontal scroll for `Brutal` difficulty.

## Validation states

- **Form errors**: `aria-live="polite"` region under the input, `text-err text-sm font-mono`.
- **JSON parse errors**: shown inside the `Inset` block above the editor with a line/column pointer.
- **Schema errors**: bulleted list, each item linking to a path in the JSON (e.g. `items[2].symbol`).

## Loading state

A single `loading` pattern:
```
[ ◐ ] Resolving src/node/config.ts · resolveConfig
```
The spinner is the unicode `◐` rotated by CSS (`animate-spin slow`) — no skeleton boxes, no shimmer.

## Empty state

A panel with a 2-line mono explanation and a single primary action. No illustrations.

## Error state

```
[ ! ] GitHub rate limit reached
       Try again in ~12 minutes or pick a curated demo.
       [ Pick curated ]
```

`!` is `text-warn` for non-fatal, `text-err` for fatal.

## Focus states

Universal: `box-shadow: 0 0 0 1px #0c0d10, 0 0 0 2px #f5c451;` (two-layer ring for visibility on dark). Never the browser default.

## Motion

- `animate-caret` — caret blink, 1.1s steps.
- No fade-in on mount. No hover transitions on cards (color only, instant).
- `@media (prefers-reduced-motion: reduce)` disables all animation including caret blink.

## Responsive

Desktop-first. Layouts collapse to single column under `md` (768px). Typing surface remains usable on tablet; phone is supported but de-prioritized (per spec).

## Accessibility

- All interactive elements reachable by keyboard.
- `Esc` always opens pause/menu.
- Visible focus ring on all interactive elements.
- Typing area uses a hidden capture element; the rendered surface has `role="region"` and `aria-label="Typing surface"`.
- Completion announces via `aria-live="polite"`.
- Contrast: `ink-100` on `ink-950` ≈ 14.5:1. `ink-300` on `ink-900` ≈ 5.6:1.

## Don'ts

No purple/blue gradients. No floating blobs. No glassmorphism. No emoji UI. No big rounded SaaS cards. No fake dashboard chrome. No icon soup. No center-aligned hero illustration.
