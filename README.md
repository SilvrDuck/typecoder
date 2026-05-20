# CodeType

Type real code. Understand real codebases.

CodeType is a static, browser-only typing trainer for public GitHub repositories. It's built for the same reason `monkeytype` exists for prose — sometimes you want to type, and the act of typing real source code is a tactile way to actually read it.

## Privacy & architecture

CodeType is intentionally stateless and server-less.

- **No backend.** The site is HTML + CSS + JS. There is nothing to host beyond a static bucket.
- **No GitHub proxy.** Every GitHub request happens from your browser directly to `api.github.com` and `raw.githubusercontent.com`.
- **No tokens or accounts.** Unauthenticated GitHub requests only, rate-limited per your IP.
- **No persistence.** Source code, session state, and results live in memory for the page lifetime. A browser refresh wipes everything. There is no `localStorage`, no `IndexedDB`, no cookies.
- **No telemetry, analytics, or LLM API calls.** CodeType never phones home.

Trade-offs you should know about:

- Only public repos are supported. Private repos and GitHub-OAuth-gated content are not in scope.
- GitHub's unauthenticated rate limit (~60 requests per hour per IP for the API; raw blob fetches are more lenient) can be hit if you load many large repos quickly. CodeType surfaces a clear "rate limit reached" error with a path back to a curated session.
- Files over 250 KB are filtered out by default to keep the typing experience focused.

## Two paths

The landing page has two affordances:

### Type right away

Three curated sessions covering different stacks. Configs are bundled (a few KB of JSON), but the source files are fetched from GitHub when you click Start.

- **Linux kernel** — `start_kernel`, `schedule`, `free_pages`, `do_sys_openat2`, `copy_process`.
- **VS Code** — `CodeMain`, `createDecorator`, `refineServiceDecorator`, two configuration helpers.
- **FastAPI** — `FastAPI`, `APIRouter`, `jsonable_encoder`, `solve_dependencies`, `HTTPException`, `Query`.

### Custom session

Three ways to build a guided session yourself:

- **Paste config.** Drop in any CodeType JSON config. Live validation, schema errors keyed by item, preview before you start.
- **Build config prompt.** Picks a goal (e.g. *trace the main execution path*, *focus on tests*), generates a prompt you paste into Claude or ChatGPT. The LLM produces JSON you paste back into CodeType. CodeType itself never calls an LLM.
- **Load any repo.** Paste a GitHub URL or `owner/repo`. CodeType fetches the tree from your browser, builds a suggested session ranked by file-name heuristics, and lets you Customize length / difficulty before starting.

## Guided config format

```json
{
  "version": 1,
  "repo": "owner/repo",
  "ref": "main",
  "title": "Understand the rendering pipeline",
  "description": "A guided path through the codebase.",
  "items": [
    { "level": "file", "path": "src/index.ts", "label": "Entry point" },
    {
      "level": "function",
      "path": "src/runtime/scheduler.ts",
      "symbol": "scheduleWork",
      "label": "Scheduler entry"
    }
  ]
}
```

Validation rules (enforced by Zod):

- `version` is exactly `1`.
- `repo` must look like `owner/repo`.
- `items` is non-empty.
- Each item has `level` (`file` | `class` | `function`), `path`, and `label`.
- `class` and `function` items need a `symbol` **or** a `startLine` + `endLine`.

Symbol resolution uses regex extractors for 13 languages (TS, JS, TSX, JSX, Python, Go, Rust, C, C++, Java, Kotlin, C#, Ruby, PHP, Swift, Scala). If a symbol can't be resolved, that item gets a clear per-item error and the rest of the session continues.

## Typing surface

The typing screen is the product. It has no sidebar, no repo browser, no config editor.

- A custom-rendered surface (not a `<textarea>`) with per-character spans for crisp `pending` / `correct` / `wrong` / `extra` states.
- A 1px-wide accent caret that blinks (disabled under `prefers-reduced-motion`).
- Whitespace mistakes get small glyphs (`·` `→` `↵`) so you can see what you typed.
- Smart Enter auto-skips leading indentation on the next line.
- Smart Tab consumes a target whitespace run instead of inserting a literal tab.
- Ctrl/Meta-Backspace deletes a word; Alt-Backspace deletes a token.
- Esc returns to landing.

Stats are honest: a single Tab that consumes 4 spaces does not count as 4 keystrokes toward your WPM denominator.

## Run

Prerequisites: Node 20+ and `pnpm`.

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # static output in dist/
pnpm preview    # serve the static build
pnpm test       # vitest
pnpm playwright # end-to-end tests with mocked GitHub
```

## Deploy

```bash
pnpm build
# upload dist/ to GitHub Pages, Netlify, Vercel static, S3, anywhere
```

No environment variables. No build-time secrets. The output is a single `index.html` and a JS/CSS bundle.

## Limitations / Not in scope

- Private repos and GitHub OAuth.
- Server-side rate-limit pooling — we deliberately push rate limits to the user's own IP.
- Persistent history and accounts — by design, each session is ephemeral.
- Heavy parsing — symbol extraction is regex-only. Generated/macro-heavy code may resolve approximately; the resolver reports per-item failures so the session continues.
- Live LLM integration — the prompt-builder asks the user to copy/paste with an external LLM rather than calling one from the client.

## Project layout

```
src/
  app/          App.tsx (view router) + App.test.tsx
  components/   Landing, TypeRightAway, CustomHub, PromptBuilder,
                PasteConfig, LoadAnyRepo, TypingSurface, TypingStats,
                FocusCard, CompletionCard, SessionSummary, LoadingScreen,
                ErrorScreen, plus design-system primitives
  core/
    config/     Zod schema, resolver, prompt templates, curated configs
    github/     parser, browser-side client, file filters, suggested session
    typing/     pure engine, metrics, weak spots, session queue
    symbols/    regex symbol extractors for 13 languages
    demo/       bundled tiny-codebase for offline / fallback
    session/    sessionStarter glue (curated → resolveConfig → store)
  curated/      linux.json, vscode.json, fastapi.json (configs only)
  state/        Zustand store (useAppStore)
  styles/       globals.css with Tailwind layers
tests-e2e/      Playwright specs with mocked GitHub
docs/
  design-decision.md      chosen direction + rationale
  design-system.md        tokens, type scale, components, motion, a11y
  design/                 9 HTML mockups for every screen
spec.md                   product spec
CLAUDE.md                 build instructions for Claude Code
```

## Design

CodeType is intentionally dark-only, mono-led, with one warm-amber accent (`#f5c451`) used very sparingly. There are no purple-blue gradients, no decorative blobs, no glassmorphism, no rounded SaaS cards. Hairlines (1px ink-700) replace shadows. See `docs/design-decision.md` and `docs/design-system.md` for the full rationale.

## License

Source code is MIT. The bundled demo repo (`src/core/demo/tinyRepo.ts`) is original code written for CodeType. Curated session configs reference real public repositories without bundling their source.
