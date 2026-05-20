# Final acceptance checklist

Do not mark the project complete until every item is checked.

## Commands

- [ ] `pnpm install` works from clean checkout
- [ ] `pnpm build` passes
- [ ] `pnpm test` passes
- [ ] `pnpm playwright test` passes

## Product

- [ ] Landing has only two primary paths
- [ ] Type right away shows Linux, VS Code, FastAPI
- [ ] Curated configs are bundled
- [ ] Third-party source code is not bundled
- [ ] Curated source files are fetched from GitHub in browser
- [ ] Custom has Paste config, Build config prompt, Load any repo
- [ ] Prompt builder updates live with dropdown
- [ ] Custom focus reveals field
- [ ] Copy prompt works
- [ ] Paste config validates JSON
- [ ] Paste config validates schema
- [ ] Paste config shows preview before start
- [ ] Load any repo works with mocked GitHub
- [ ] Typing surface is custom-rendered
- [ ] Correct characters advance caret
- [ ] Wrong characters mark calmly
- [ ] Backspace corrects
- [ ] Completion card appears
- [ ] Session summary appears
- [ ] Weak spots practice works or is documented as MVP-limited

## Architecture

- [ ] No backend
- [ ] No serverless functions
- [ ] No database
- [ ] No auth
- [ ] No telemetry
- [ ] No analytics
- [ ] No cookies
- [ ] No LLM API calls
- [ ] No GitHub token handling
- [ ] No server-side GitHub proxy
- [ ] Source code not persisted outside memory

## Design

- [ ] Autonomous design pass completed
- [ ] `docs/design-decision.md` exists
- [ ] `docs/design-system.md` exists
- [ ] Mockups/previews exist in `docs/design/`
- [ ] Playwright screenshots captured after implementation
- [ ] Real app compared against chosen design
- [ ] Visible drift fixed
- [ ] UI does not look like generic AI SaaS
- [ ] product-reviewer approves UI

## Error states

- [ ] invalid repo input
- [ ] repo not found
- [ ] private repo or 403
- [ ] rate limit exceeded
- [ ] empty repo/no supported files
- [ ] truncated tree
- [ ] file too large
- [ ] malformed config
- [ ] invalid schema
- [ ] missing path
- [ ] missing symbol
- [ ] network failure

## Docs

- [ ] README explains CodeType
- [ ] README explains privacy/stateless behavior
- [ ] README explains browser-side GitHub requests
- [ ] README explains curated sessions
- [ ] README explains custom configs
- [ ] README explains prompt builder
- [ ] README explains limitations
- [ ] README explains run/build/test/deploy

## Final report

- [ ] implemented features summarized
- [ ] tests run listed
- [ ] manual live GitHub test result included
- [ ] known limitations included
