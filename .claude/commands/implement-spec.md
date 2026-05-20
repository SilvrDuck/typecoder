# Implement spec.md

Execute the full autonomous CodeType build from `spec.md`.

Read:

1. `spec.md`
2. `CLAUDE.md`
3. `.claude/skills/code-type-autonomous-build/SKILL.md`

Then follow the autonomous build workflow.

Do not ask the user for design decisions.
Do not ask the user for implementation choices.
Do not stop after a partial prototype.
Use kanban-md if available, or a markdown board fallback if not.
Use Pencil if available, or local high-fidelity design artifacts if not.
Use Playwright screenshots as a reality check.
Use the product-reviewer subagent before marking slices done.

Continue until the final acceptance criteria in `spec.md` pass or a true external blocker prevents progress.
