# CodeType — design decision

## Three directions explored

### A. Terminal Minimal — rejected

Sparse, near-black, almost no chrome, single accent. The typing surface is the entire product visually.

Why rejected:
- Too thin for the Custom flow. Prompt builder, paste-config, load-any-repo, and the suggested-session screen all need real hierarchy. Terminal Minimal collapses them into formless monochrome.
- Hard to differentiate cards, inputs, and status without violating its own restraint.
- The two-path landing card affordance is weak when there is no card.

### C. Code Arcade — rejected

Energetic, IDE-like, gentle highlight bars, dense status chrome. Inspired by typing games and code editors.

Why rejected:
- Drifts toward "fun typing game" instead of "serious tool I use to learn a codebase".
- Risks the gamified look CLAUDE.md explicitly forbids ("emoji-heavy UI", "noisy animations").
- Adds chrome that fights with long typing sessions.

### B. Premium Devtool — **chosen**

Quiet, surgical, dark-first. Inspired by Raycast, Linear, Ghostty, and modern code editors at the *quality* bar only.

Why chosen:
- Carries enough hierarchy for prompt builder, paste-config, and load-any-repo without ceremony.
- Sustains long typing sessions: low-contrast chrome, high-contrast typing surface.
- The two-path landing is a single composed card system that reads as deliberate, not generic.
- A single warm amber accent (`#f5c451`) reads as a terminal cursor / inline link, not as SaaS purple-blue.

## Key choices

- **Dark only.** No light theme. Color-scheme locked.
- **Single accent.** `#f5c451` (warm amber). Never combined with another accent, never gradient.
- **Mono-first typography.** Headings, marks, stats, and code are JetBrains Mono. Inter only for paragraph copy. The product is about code; the type reflects it.
- **No shadows.** Elevation comes from 1px hairlines (`rgba(255,255,255,0.04)`), never from blur.
- **Tight 4px corner radius.** No 16–24px pill cards.
- **No gradients, no blobs, no decorative illustration.**
- **Motion only on the typing surface.** Caret blink (`@keyframes caret`), correctness color transitions. No page transitions, no card hover-lift.
- **Cursor is sacred.** A solid 1px-wide accent block, no smooth animation other than blink.

## Component vocabulary

| Token | Use |
|---|---|
| **Surface** | The full-bleed `bg-ink-950` background. Always single color. |
| **Panel** | `bg-ink-900` with a 1px ink-700 border. Used for cards, editors, and the typing chrome. |
| **Inset** | `bg-ink-850` inside a panel for code blocks, JSON previews, inputs. |
| **Rule** | 1px ink-700 hairline. Separates sections. |
| **Mark** | The `▶ CodeType` mono brand mark. Top-left only. |
| **Pill** | Inline mono badge for language/status. ink-700 bg, 2xs size, ink-300 text. |
| **Kbd** | `<kbd class="kbd">` for keyboard hints. Mono, 1px border. |

## Layout grid

- Landing: centered 1-column, 36rem max width.
- Type-right-away: 3 panel grid, 56rem max width.
- Custom hub: 3 panel grid, 56rem max width.
- Prompt builder: 2-column (controls | preview), 72rem.
- Typing screen: full bleed, but typing surface clamped to 72ch.
- Session summary: centered card, 48rem.

## Implementation risks

- The typing surface needs character-perfect rendering — monospace + per-char spans + a custom caret. Risk mitigated by writing the engine as pure functions and the surface as a single `TypingSurface` component.
- The amber accent must not slip into more than ~3% of pixels on screen; if it does we drift toward "warning state SaaS".
- Custom focus reveal in the prompt builder must not feel like a hidden form field. We render it as a 4th input slot, not as an expand/collapse.

## Anti-checklist (what this design is *not*)

- Not Monkeytype. We have no test-length picker chrome, no theme switcher, no rgb shimmer.
- Not Raycast. We have no glass, no popover stack.
- Not Linear. We have no sidebar, no avatar chrome.
- Not a GitHub file browser. We hide trees until the user opts into Customize.
