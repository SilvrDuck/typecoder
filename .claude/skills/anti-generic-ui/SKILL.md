---
name: anti-generic-ui
description: Reviews CodeType UI for generic AI-generated design and gives concrete fixes.
disable-model-invocation: true
allowed-tools: Bash Read Write Edit Grep Glob
---

# Anti-generic UI review

Review the current UI like a strict product designer.

The app should feel like a premium developer typing tool.

## Reject if you see

- generic AI/SaaS landing page
- decorative gradients without purpose
- purple blob backgrounds
- cliché glowing cards
- weak typography
- random icon soup
- too many rounded cards
- unclear hierarchy
- fake dashboard feel
- default Tailwind look
- unpolished empty/loading/error states
- awkward spacing
- clutter
- motion that distracts from typing
- inconsistent component styles
- a GitHub utility with a typing widget attached

## Require

- strong type scale
- calm dark theme
- restrained accent color
- excellent keyboard focus states
- polished card rhythm
- beautiful typing surface
- minimal first screen
- clear two-path landing
- custom flow that feels deliberate
- prompt builder that updates live and feels crafted
- screenshots checked with Playwright

## Procedure

1. Run the app.
2. Use Playwright to visit:
   - landing page
   - Type right away
   - Custom hub
   - prompt builder
   - config editor
   - typing screen
   - session summary
   - error state
3. Capture screenshots.
4. List concrete visual issues.
5. Fix the highest-impact issues immediately.
6. Re-run screenshots.
7. Stop only when the UI no longer looks like a generic generated template.

## Taste guidance

Prefer a quiet, sharply composed developer tool.

Good references by quality level only, not visual cloning:

- Monkeytype
- Raycast
- Linear
- Ghostty
- modern terminal UIs
- carefully designed code editors
