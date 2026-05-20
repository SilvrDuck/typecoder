# How to use this zip

1. Create a new GitHub repo.
2. Clone it locally.
3. Unzip this package into the repo root.
4. Open Claude Code in the repo.
5. Tell Claude:

```txt
Hey, implement spec.md
```

That should be enough. The repo contains:

- `spec.md` — full product/build spec
- `CLAUDE.md` — project-level Claude instructions
- `.claude/skills/` — autonomous build, design, kanban, UI review, and slice shipping skills
- `.claude/agents/product-reviewer.md` — read-only review gate
- `.claude/settings.json` — conservative lint hook
- `.claude/commands/implement-spec.md` — optional slash command content
- `docs/autonomous-goal-prompt.md` — optional explicit `/goal` prompt

Optional preflight if you want kanban-md initialized yourself:

```bash
kanban-md init --name "CodeType"
kanban-md skill install
```

The instructions also include a fallback markdown board, so Claude should continue even if kanban-md is missing.
