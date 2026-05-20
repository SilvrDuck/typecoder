---
name: ship-slice
description: Implements one small CodeType task end-to-end using kanban-md or fallback board, tests, self-review, and a clean commit or PR.
disable-model-invocation: true
allowed-tools: Bash Read Write Edit Grep Glob
---

# Ship one CodeType slice

Use this workflow for exactly one small vertical slice.

## 1. Pick and claim

Use kanban-md if available. Otherwise use `docs/implementation-board.md`.

- Inspect the board.
- Pick one unblocked task.
- Claim it.
- Move it to In Progress.
- If no suitable task exists, create one small task from `spec.md`.

Prefer tasks that produce a usable product increment.

## 2. Branch/worktree

Create an isolated branch or worktree when practical.

Branch name format:

```txt
slice/<short-task-name>
```

Do not work directly on main unless the repo has no git history yet or branch setup would add friction disproportionate to the task.

## 3. Implement

Implement only this slice.

Keep the diff focused.

No unrelated refactors.
No speculative abstractions.
No placeholder UI in user-facing flows.
No fake functionality unless it is a documented demo fixture.

## 4. Test

Run the smallest useful test set first, then broader tests.

Common commands:

```bash
pnpm lint
pnpm test
pnpm build
pnpm playwright test
```

If a command does not exist, inspect package.json and use the project’s actual commands.

For UI changes:

- run the dev server
- use Playwright
- take screenshots
- inspect the result
- fix generic-looking or broken UI before continuing

## 5. Self-review

Review the diff before committing.

Reject your own work if:

- any visible UI looks generic or unfinished
- controls do not work
- loading/error states are missing
- tests are absent for nontrivial logic
- Playwright coverage is missing for a user flow
- source code is persisted outside memory
- GitHub requests go through a backend
- there are console errors
- README/spec drift is introduced

Fix issues before moving on.

## 6. Product-reviewer gate

Use the `product-reviewer` subagent.

Treat any reject verdict as blocking.

Fix blocking issues before continuing.

## 7. Commit

Commit with a focused message.

Format:

```txt
feat(scope): short description
fix(scope): short description
test(scope): short description
chore(scope): short description
```

## 8. PR or local review

If `gh` is authenticated and a remote exists:

- push branch
- open a small PR
- include test results
- review PR diff
- merge if checks pass and the slice is complete

If not:

- keep the local commit
- write a short review note in the kanban task

## 9. Close task

Only move the task to Done when:

- implementation is complete
- tests pass
- build passes when relevant
- UI was inspected if relevant
- task acceptance criteria are satisfied
- no known regression remains
