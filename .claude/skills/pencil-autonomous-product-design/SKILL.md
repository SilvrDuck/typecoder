---
name: pencil-autonomous-product-design
description: Autonomously designs CodeType in Pencil or local fallback artifacts, chooses the best direction, documents the system, and gates implementation.
disable-model-invocation: false
allowed-tools: Bash Read Write Edit Grep Glob
---

# Autonomous Pencil Product Design for CodeType

The user does not want to make design decisions manually.

Use Pencil to design CodeType before implementing major UI surfaces when Pencil is available.

If Pencil is not available in this Claude Code environment, create equivalent local high-fidelity design artifacts in `docs/design/` using Markdown, HTML, SVG, or screenshotable prototypes. Do not stop and ask the user to install Pencil.

## Goal

Create a distinctive, polished design direction for CodeType.

It should feel like a premium developer typing tool, not a generic AI-generated website.

## Required screens

Create high-fidelity mockups/previews for:

1. Landing
2. Type right away
3. Custom hub
4. Prompt builder
5. Paste config
6. Typing screen
7. Session summary
8. Error state
9. Loading state

## Explore 3 directions

Create three visual directions:

### Direction A: Terminal Minimal

Sparse, type-led, near-black, very low chrome, focused on the typing surface.

### Direction B: Premium Devtool

Raycast/Linear-like developer product feel, richer panels, sharp hierarchy, restrained polish.

### Direction C: Code Arcade

Still serious, but slightly more energetic. Inspired by typing games, terminals, and code editors. Must not become childish.

## Autonomous selection

Evaluate the three directions using this rubric:

- Does it avoid generic AI SaaS design?
- Does it make typing feel central?
- Does it feel premium?
- Does it support long coding sessions?
- Is the hierarchy clear?
- Will it be feasible to implement cleanly in React/Tailwind?
- Does it support all required states?
- Does it feel distinctive?

Choose the best direction yourself.

Do not ask the user to choose.

## Deliverables

Produce:

- Pencil files when possible
- screenshots, previews, SVG, HTML, or Markdown mockups in `docs/design/`
- `docs/design-system.md`
- `docs/design-decision.md`

## docs/design-decision.md

Include:

- chosen direction
- rejected directions
- short reason each was rejected
- final rationale
- implementation risks

Keep it concise.

## docs/design-system.md

Include:

- typography scale
- spacing scale
- layout rules
- background colors
- text colors
- accent color
- card style
- button style
- input style
- typing surface style
- validation/error states
- loading states
- focus states
- reduced-motion behavior
- responsive behavior

## Implementation gate

Do not implement major UI code before this design pass is complete.

After implementation:

1. Run the app.
2. Use Playwright to capture screenshots of the same screens.
3. Compare screenshots to the chosen design direction.
4. Fix visible drift.
5. Repeat until the real app matches the design direction.

## Rejection criteria

Reject your own design if it looks like:

- generic AI startup
- purple gradient SaaS
- default Tailwind template
- fake dashboard
- random icon soup
- decorative blob background
- cluttered form app
- unstyled developer utility
- boring GitHub browser

## Local fallback suggestion

If no visual design tool is available, create simple static HTML mockups in `docs/design/mockups/` that can be opened in a browser and screenshotted. These should be high-fidelity enough to guide implementation.

Minimum fallback files:

```txt
docs/design/mockups/landing.html
docs/design/mockups/type-right-away.html
docs/design/mockups/custom-hub.html
docs/design/mockups/prompt-builder.html
docs/design/mockups/config-editor.html
docs/design/mockups/typing-screen.html
docs/design/mockups/session-summary.html
docs/design/mockups/error-state.html
docs/design/mockups/loading-state.html
```
