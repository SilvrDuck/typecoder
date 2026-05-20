---
name: kanban-autonomous-development
description: Uses kanban-md or a local markdown fallback to manage CodeType implementation as small, reviewed, testable slices.
disable-model-invocation: true
allowed-tools: Bash Read Write Edit Grep Glob
---

# Kanban Autonomous Development

Use this skill to manage CodeType work as small, reviewed tasks.

## Tool detection

First check whether kanban-md is available:

```bash
command -v kanban-md || true
```

If available, use it as the source of truth.

If unavailable, create and maintain:

```txt
docs/implementation-board.md
```

Do not stop to ask the user to install kanban-md.

## Initialize board

If using kanban-md and no board exists:

```bash
kanban-md init --name "CodeType"
```

If the command differs locally, inspect `kanban-md --help` and adapt.

## Fallback board format

If using markdown fallback, create:

```md
# CodeType Implementation Board

## Backlog

## Ready

## In Progress

## Review

## Done

## Blocked
```

Each task should use:

```md
### TASK-ID — Title

Status: Ready
Priority: P0 | P1 | P2
Epic: Name
Dependencies: none | TASK-ID
Expected files: list

Acceptance criteria:
- ...

Tests:
- ...

Definition of done:
- implemented
- tests pass
- reviewed
- committed
```

## Task lifecycle

Use this lifecycle:

```txt
Backlog -> Ready -> In Progress -> Review -> Done
```

Use Blocked only for real external blockers.

## Task sizing

A task is too large if it cannot be:

- implemented in one focused diff
- reviewed quickly
- tested locally
- committed with one clear message

Split large tasks.

## Required epics

Create tasks under:

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

## Per-task done criteria

Do not mark Done until:

- implementation is complete
- tests were added or updated where relevant
- relevant checks pass
- product-reviewer did not reject the work
- UI was inspected with Playwright if relevant
- the diff is committed
- task notes mention tests run
