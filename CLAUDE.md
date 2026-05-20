# CodeType Claude Project Instructions

This repository is for **CodeType**, a static browser-only app for typing real source code from public GitHub repos.

When the user says anything equivalent to “implement spec.md”, execute the full autonomous build workflow. Do not ask for design choices or implementation choices. Read `spec.md`, this file, and the project skills in `.claude/skills/` before beginning.

## Prime directive

Ship a finished MVP, not a half-finished prototype.

The product must feel premium, focused, and finished. It must not look like a generic AI-generated website.

## Non-negotiables

- No backend.
- No database.
- No auth.
- No telemetry.
- No analytics.
- No cookies.
- No server-side GitHub proxy.
- No LLM API calls.
- All GitHub requests happen from the user's browser.
- The app must build as static assets.
- The typing screen is the product. Keep it clean and distraction-free.

## Design bar

The UI must feel closer to Monkeytype, Raycast, Linear, Ghostty, or a strong developer tool than a generic AI startup site.

Avoid:

- purple-blue AI gradients
- floating blobs
- generic hero illustrations
- glassmorphism for no reason
- giant rounded SaaS cards everywhere
- emoji-heavy UI
- stock “AI assistant” language
- fake dashboard chrome
- noisy animations
- cluttered forms
- excessive borders and shadows
- default Tailwind template feel

Prefer:

- dark-first
- strong typography
- quiet confidence
- tight spacing
- sharp hierarchy
- beautiful empty/loading/error states
- keyboard-first flows
- responsive but desktop-optimized layout
- motion only where it improves typing feedback
- a typing surface that feels crafted

## Autonomous design rule

The user does not want to design the product manually.

For visual/product design decisions:

- make a strong default choice
- document the reasoning briefly
- proceed
- only ask the user if there is a product-level ambiguity that changes functionality

Do not ask the user to choose:

- color palette
- type scale
- spacing
- card style
- button style
- layout variants
- animation style
- icon style
- landing page composition

Use Pencil autonomously if available. If Pencil is unavailable, create equivalent local high-fidelity artifacts in `docs/design/` and proceed. Do not block on user input.

## Required autonomous design workflow

Before implementing major UI code:

1. Use `.claude/skills/pencil-autonomous-product-design/SKILL.md`.
2. Create 2–3 distinct design directions.
3. Critique them against the design bar.
4. Choose the strongest direction yourself.
5. Document the decision in `docs/design-decision.md`.
6. Document the visual system in `docs/design-system.md`.
7. Save mockups or previews in `docs/design/`.
8. Implement the React/Tailwind UI from the chosen direction.
9. Use Playwright screenshots to compare the real app against the chosen design.
10. Fix visible drift before marking UI work done.

## Finished means finished

Do not call the product done until:

- `pnpm install` works from clean checkout
- `pnpm build` passes
- `pnpm test` passes
- `pnpm playwright test` passes
- curated sessions are implemented
- prompt builder is implemented
- guided config validation is implemented
- typing engine is implemented
- typing UI is polished
- error states exist
- README exists
- autonomous design pass completed
- chosen/rejected design directions are documented
- Playwright screenshots have been reviewed
- at least one manual live GitHub repo test has been performed
- product-reviewer approves
- no TODO placeholders remain in core flows
- no fake/stubbed functionality remains except documented demo fixtures
- no console errors appear during normal use

## Workflow

Use kanban-md as the source of truth for implementation tasks if available.

If kanban-md is available:

1. Initialize a board if no board exists.
2. Create small MVP tasks from `spec.md`.
3. Claim one task at a time.
4. Work in small vertical slices.
5. Keep the app buildable and testable after each slice.
6. Move tasks through in-progress, review, and done only after verification.

If kanban-md is unavailable:

1. Create `docs/implementation-board.md`.
2. Maintain the same task lifecycle manually.
3. Continue without asking the user to install tools.

For every task:

1. Claim the task.
2. Create or use an isolated branch/worktree when practical.
3. Implement the smallest complete slice.
4. Add or update tests.
5. Run relevant tests.
6. Review the diff critically.
7. Fix issues.
8. Commit.
9. Open a PR if GitHub CLI is available and authenticated, otherwise keep a clean local commit.
10. Move the task to review, then done only after verification.

Never batch unrelated features into one large change.

## Review behavior

After each slice, review your own work as if rejecting a weak PR.

Look for:

- broken UX
- generic visual design
- missing loading/error states
- dead buttons
- inaccessible controls
- untested code
- overcomplicated abstractions
- hidden backend assumptions
- source-code persistence
- bad mobile/tablet behavior
- console errors
- Playwright failures

Fix findings before moving on.

Before merging or marking a slice done, use the `product-reviewer` subagent. Treat any reject verdict as blocking.

## Playwright

Use Playwright not only for tests, but to inspect the app like a user.

For UI work:

- run the app
- open it with Playwright
- take screenshots
- inspect the landing page
- inspect the custom flow
- inspect the typing screen
- inspect error states
- compare against the design bar
- revise until it no longer looks generic

## Task sizing

A task is too large if it cannot be reviewed in one focused diff.

Prefer tasks like:

- landing shell
- curated card data model
- typing engine pure functions
- typing surface rendering
- prompt builder templates
- config schema validation
- GitHub repo parser
- repo loading error states
- Playwright mocked GitHub tests

Avoid tasks like:

- build entire app
- implement all UI
- finish custom mode
- add all tests

## Product priority

Prioritize:

1. typing experience
2. visual polish
3. reliable static/browser-only architecture
4. curated sessions
5. config validation
6. prompt builder
7. repo loader
8. parser sophistication

If Tree-sitter delays the product, use regex extraction first.
If CodeMirror delays the typing surface, do not use it.

## Default autonomous command behavior

If the user writes “Hey, implement spec.md” or similar:

1. Read `spec.md`.
2. Read this file.
3. Read `.claude/skills/code-type-autonomous-build/SKILL.md`.
4. Execute that workflow.
5. Keep going until the acceptance criteria pass or a real external blocker prevents progress.
6. Do not ask the user to choose designs, tools, libraries, task order, colors, layouts, or copy.
