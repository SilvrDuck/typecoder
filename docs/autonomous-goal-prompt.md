# Optional `/goal` prompt

The repo is designed so you can simply tell Claude Code:

```txt
Hey, implement spec.md
```

If you want to explicitly use Claude Code `/goal` mode, use this prompt:

```txt
/goal Ship CodeType to a finished MVP state from spec.md.

Read spec.md, CLAUDE.md, and all project skills in .claude/skills.

The user does not want to participate in design decisions.
Before implementation, autonomously use Pencil to create, evaluate, and choose a design direction. If Pencil is unavailable, create equivalent local high-fidelity design artifacts in docs/design and proceed. Do not ask the user to choose. Document the decision and proceed.

Use kanban-md as the source of truth if available. If kanban-md is unavailable, create docs/implementation-board.md and use the same task lifecycle manually.

Work one small slice at a time. For each slice:
- claim the next unblocked task
- create an isolated branch or worktree when practical
- implement only that slice
- add/update tests
- run relevant checks
- inspect UI with Playwright when visual
- use the product-reviewer subagent before merge or done
- fix all blocking issues
- commit the slice
- open and merge a small PR if gh is authenticated, otherwise keep a clean local commit
- move the kanban task to done only after verification

Keep going until all MVP tasks are done and the final acceptance criteria pass.

Completion condition:
- kanban-md or fallback board has no open MVP tasks
- pnpm install works from clean checkout
- pnpm build passes
- pnpm test passes
- pnpm playwright test passes
- curated Linux, VS Code, and FastAPI cards exist
- curated configs are bundled without bundling third-party source code
- source files are fetched from GitHub in the browser
- Custom has Paste config, Build config prompt, and Load any repo
- prompt builder updates live when the template changes
- guided config validation and preview work
- typing surface is custom-rendered and polished
- typing metrics work
- session summary works
- major error states are implemented
- README is complete
- Pencil or equivalent design pass completed autonomously
- chosen design direction documented
- rejected directions documented
- design system documented
- Playwright screenshots compared against chosen design
- visible drift fixed
- product-reviewer gives approve
- no backend, auth, database, cookies, telemetry, analytics, server proxy, or LLM API calls exist
- no TODO placeholders or fake core flows remain
```
