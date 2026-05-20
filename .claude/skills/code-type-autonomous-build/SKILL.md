---
name: code-type-autonomous-build
description: Executes the full autonomous CodeType MVP build from spec.md with design gate, kanban tasking, small slices, self-review, Playwright, and final acceptance checks.
disable-model-invocation: false
allowed-tools: Bash Read Write Edit Grep Glob
---

# CodeType Autonomous Build

Use this skill when the user asks to implement `spec.md`.

The user wants a hands-off fire-and-forget build. Do not ask the user for design decisions, implementation decisions, colors, layouts, or task order.

## Inputs

Read:

1. `spec.md`
2. `CLAUDE.md`
3. this skill
4. `.claude/skills/pencil-autonomous-product-design/SKILL.md`
5. `.claude/skills/kanban-autonomous-development/SKILL.md`
6. `.claude/skills/ship-slice/SKILL.md`
7. `.claude/skills/anti-generic-ui/SKILL.md`
8. `.claude/agents/product-reviewer.md`

## High-level workflow

1. Initialize the project if needed.
2. Initialize or emulate kanban-md.
3. Create an implementation board from `spec.md`.
4. Run the autonomous design gate.
5. Build the app one small vertical slice at a time.
6. Review every slice.
7. Test every slice.
8. Commit every slice.
9. Continue until final acceptance criteria pass.

## Step 1 — Inspect repository

Check:

- git status
- package.json presence
- existing source files
- existing tests
- existing docs
- existing `.claude` files
- whether kanban-md is available
- whether gh CLI is available and authenticated
- whether Pencil/MCP/design tooling is available

Do not fail just because optional tools are missing. Use local fallbacks and keep going.

## Step 2 — Initialize app

If there is no app yet:

- create a Vite React TypeScript project in-place
- install Tailwind CSS
- install Zustand
- install Zod
- install Vitest
- install Playwright
- use pnpm
- set up static build

Create scripts:

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "test": "vitest run",
  "test:watch": "vitest",
  "playwright": "playwright test",
  "lint": "eslint ."
}
```

If ESLint setup becomes a distraction, use the standard Vite/TS lint setup or create a minimal reliable one. Do not let lint tooling block product progress.

## Step 3 — Initialize task board

Use kanban-md if available.

If not available, create `docs/implementation-board.md` and maintain task state there.

Seed tasks under these epics:

1. Project foundation
2. Autonomous design
3. Landing and visual system
4. Curated sessions
5. Typing engine
6. Typing surface
7. Guided config
8. Prompt builder
9. Browser-side GitHub loading
10. Error states
11. Results and weak spots
12. Tests and polish
13. README and release

Each task must include:

- title
- acceptance criteria
- test expectations
- priority
- dependencies
- expected files touched
- definition of done

Tasks must be small enough for one focused commit.

## Step 4 — Autonomous design gate

Before writing major UI code, run the Pencil autonomous product design workflow.

If Pencil is available:

- create Pencil mockups for required screens
- export or save previews in `docs/design/`

If Pencil is unavailable:

- create local high-fidelity design artifacts in `docs/design/`
- acceptable formats: Markdown wireframes, HTML static mockups, SVG mockups, screenshotable prototypes
- still create three design directions and choose one

Required deliverables:

- `docs/design-decision.md`
- `docs/design-system.md`
- `docs/design/landing.*`
- `docs/design/type-right-away.*`
- `docs/design/custom-hub.*`
- `docs/design/prompt-builder.*`
- `docs/design/config-editor.*`
- `docs/design/typing-screen.*`
- `docs/design/session-summary.*`
- `docs/design/error-state.*`
- `docs/design/loading-state.*`

Do not ask the user to choose. Choose the best design direction yourself.

## Step 5 — Build in slices

Use the ship-slice workflow for each task.

Typical order:

1. project foundation
2. design tokens and layout shell
3. landing page with two paths
4. local demo data
5. typing engine pure functions
6. typing surface MVP
7. results/metrics
8. curated config model
9. GitHub browser-side fetch layer
10. curated sessions resolution
11. config schema and editor
12. prompt builder
13. load any repo
14. error states
15. Playwright tests
16. README
17. final polish

Keep each slice small.

## Step 6 — Review gate

For each slice:

- run relevant tests
- run build when reasonable
- inspect UI with Playwright for visual changes
- use `product-reviewer` subagent before marking done
- fix blocking issues
- commit

If gh CLI is authenticated and remote exists:

- push branch
- open small PR
- merge after review/checks

If not:

- use clean local commits
- record review notes in the task board

## Step 7 — Final acceptance

Run:

```bash
pnpm install
pnpm build
pnpm test
pnpm playwright test
```

Also perform a manual live GitHub test against at least one small public repo and, if rate limits allow, one curated repo.

Check:

- no backend files exist
- no server proxy exists
- no database/auth/telemetry/cookies/analytics exist
- no LLM API calls exist
- source code is not persisted outside memory
- curated configs do not bundle third-party source
- Playwright screenshots reviewed
- UI does not look generic
- README is complete

## Completion report

When done, report:

- implemented features
- tests run
- manual live GitHub test result
- known limitations
- any optional tool fallbacks used

Do not claim done if acceptance criteria fail.
