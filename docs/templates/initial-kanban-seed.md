# Initial kanban seed for CodeType

Use this to create the initial board if kanban-md is available, or to populate `docs/implementation-board.md` if not.

## Epic 1 — Project foundation

### Foundation: initialize Vite React TypeScript app

Acceptance criteria:
- Vite React TS app exists
- pnpm is configured
- Tailwind is installed
- Vitest is installed
- Playwright is installed
- build/test scripts exist

Tests:
- `pnpm build`
- `pnpm test`

### Foundation: app shell and routing state

Acceptance criteria:
- app can switch between landing, type-right-away, custom, typing, results views
- state is client-only
- no backend code exists

Tests:
- smoke unit test or Playwright landing render

## Epic 2 — Autonomous design

### Design: create autonomous design directions

Acceptance criteria:
- three directions created
- chosen direction documented
- rejected directions documented
- design system documented
- mockups/previews saved in docs/design

Tests:
- design docs exist
- product-reviewer approves direction

### Design: implement design tokens

Acceptance criteria:
- Tailwind/theme tokens reflect design-system.md
- base typography, color, spacing, focus states implemented

Tests:
- visual smoke through Playwright screenshots

## Epic 3 — Landing and visual system

### Landing: two-path first screen

Acceptance criteria:
- first screen shows only Type right away and Custom
- no repo input on first screen
- polished dark-first layout

Tests:
- Playwright landing test

### Landing: curated repo cards

Acceptance criteria:
- Linux, VS Code, FastAPI cards exist
- copy matches spec
- Start actions wired to curated config loader

Tests:
- Playwright card render/click test

### Custom: custom hub

Acceptance criteria:
- Paste config, Build config prompt, Load any repo cards exist
- no advanced-mode wording
- navigation works

Tests:
- Playwright custom hub test

## Epic 4 — Curated sessions

### Curated: config model and files

Acceptance criteria:
- `src/curated/linux.json`
- `src/curated/vscode.json`
- `src/curated/fastapi.json`
- configs conform to schema
- no third-party source code bundled

Tests:
- Vitest curated config shape test

### Curated: load and resolve curated session

Acceptance criteria:
- selecting curated card loads config
- required files are fetched from GitHub in browser
- first item resolves and can start
- upcoming items preload

Tests:
- Playwright mocked GitHub test

## Epic 5 — Typing engine

### Typing: pure engine

Acceptance criteria:
- startTyping/applyKey/reset/isComplete implemented
- code whitespace/newlines handled
- backspace and word deletion handled

Tests:
- Vitest engine tests

### Typing: metrics

Acceptance criteria:
- raw WPM, code WPM, accuracy, mistakes, progress implemented

Tests:
- Vitest metrics tests

### Typing: weak spots

Acceptance criteria:
- hardest chars and lines tracked in memory
- weak-spot mini-session generated

Tests:
- Vitest weak spot tests

## Epic 6 — Typing surface

### Typing UI: custom rendered character surface

Acceptance criteria:
- hidden input or key capture
- custom spans for target/input
- caret visible and smooth
- correct/incorrect/pending states
- whitespace/newline display

Tests:
- Playwright typing correct/wrong/backspace tests

### Typing UI: item completion and focus card

Acceptance criteria:
- optional focus card
- snippet complete card
- next/restart actions

Tests:
- Playwright completion test

## Epic 7 — Guided config

### Config: Zod schema

Acceptance criteria:
- schema validates all rules
- friendly errors generated

Tests:
- Vitest schema tests

### Config: paste editor and preview

Acceptance criteria:
- malformed JSON error
- invalid schema error
- resolved preview
- Start guided session action

Tests:
- Playwright config tests

### Config: resolver

Acceptance criteria:
- validates paths against repo tree
- resolves symbols or line ranges
- reports item-level errors

Tests:
- Vitest resolver tests
- Playwright mocked GitHub path/symbol error tests

## Epic 8 — Prompt builder

### Prompt: templates and generation

Acceptance criteria:
- all templates implemented
- each has distinct best-for copy and priorities
- generated prompt follows schema and rules

Tests:
- Vitest prompt tests

### Prompt: polished reactive UI

Acceptance criteria:
- dropdown updates helper text, bullets, preview
- custom focus reveals field
- copy prompt/schema buttons work

Tests:
- Playwright prompt builder tests

## Epic 9 — Browser-side GitHub loading

### GitHub: repo input parser

Acceptance criteria:
- owner/repo and GitHub URLs parsed
- branch/blob/tree best-effort parse
- malformed inputs rejected

Tests:
- Vitest parser tests

### GitHub: fetch client and caches

Acceptance criteria:
- metadata/tree/file fetchers implemented
- in-memory caches implemented
- no persistence
- browser-side only

Tests:
- unit tests with fetch mocks

### GitHub: file filtering and suggested session

Acceptance criteria:
- filters match spec
- source extensions preferred
- suggested session generated
- customize controls work

Tests:
- Vitest filtering/session tests
- Playwright load-any-repo mocked test

## Epic 10 — Error states

### Errors: GitHub and config states

Acceptance criteria:
- clear UI for 403, 404, 409, 422, rate limit, truncated tree, missing path, missing symbol

Tests:
- Playwright mocked error tests

### Errors: visual states

Acceptance criteria:
- polished error/loading/empty states
- no generic default boxes

Tests:
- Playwright screenshots reviewed

## Epic 11 — Results and weak spots

### Results: session summary

Acceptance criteria:
- WPM, accuracy, completed snippets, mistakes shown
- hardest characters/lines shown
- restart/new session/weak spots actions

Tests:
- Playwright summary test

## Epic 12 — Tests and polish

### Tests: Playwright coverage

Acceptance criteria:
- all required Playwright scenarios implemented
- GitHub mocked
- no live network dependency in CI tests

Tests:
- `pnpm playwright test`

### Polish: anti-generic UI pass

Acceptance criteria:
- anti-generic-ui skill run
- screenshots captured
- visible issues fixed
- product-reviewer approves

Tests:
- screenshot review notes

## Epic 13 — README and release

### Docs: README

Acceptance criteria:
- README covers all spec topics
- static deployment instructions included
- privacy/stateless guarantee clear

Tests:
- product-reviewer review

### Release: final acceptance

Acceptance criteria:
- all acceptance checks pass
- final report written

Tests:
- `pnpm install`
- `pnpm build`
- `pnpm test`
- `pnpm playwright test`
- manual live GitHub test
