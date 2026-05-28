/**
 * Prompt builder templates.
 *
 * The site never calls an LLM. The user pastes the generated prompt
 * into Claude/ChatGPT themselves, then pastes the JSON output back into
 * the paste-config screen.
 *
 * Each template has:
 *   - human-facing copy (label, bestFor, bullets)
 *   - prioritize / avoid lists that drive the LLM's selection
 *   - id used by the UI for selection state
 */

export type PromptTemplateId =
  | "understand-codebase"
  | "trace-execution"
  | "learn-public-api"
  | "focus-architecture"
  | "focus-tests"
  | "focus-performance"
  | "focus-data-model"
  | "focus-ui"
  | "focus-build"
  | "custom";

export type PromptTemplate = {
  id: PromptTemplateId;
  label: string;
  bestFor: string;
  bullets: string[];
  prioritize: string[];
  avoid: string[];
  /** Short tag the LLM sees as the "Outcome:" header. */
  outcomeLabel: string;
};

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: "understand-codebase",
    label: "Understand the codebase",
    bestFor: "First pass through an unfamiliar repository.",
    bullets: [
      "find entry points",
      "cover major modules",
      "include public APIs",
      "show core abstractions",
      "pick representative files",
    ],
    prioritize: [
      "entry points",
      "major modules",
      "public APIs",
      "core abstractions",
      "representative files",
    ],
    avoid: ["deep internals too early", "generated files", "repetitive utilities"],
    outcomeLabel: "Understand the codebase",
  },
  {
    id: "trace-execution",
    label: "Trace the main execution path",
    bestFor: "Understanding how execution moves through the project.",
    bullets: [
      "find entry points",
      "follow major calls",
      "prefer functions over files",
      "avoid generated code",
    ],
    prioritize: [
      "CLI or app entry points",
      "config loading",
      "request/event handling",
      "orchestration functions",
      "the main call chain",
    ],
    avoid: ["isolated helpers", "test-only paths", "unrelated modules"],
    outcomeLabel: "Trace the main execution path",
  },
  {
    id: "learn-public-api",
    label: "Learn the public API",
    bestFor: "Understanding how users interact with the library or app.",
    bullets: [
      "follow exported functions",
      "include public classes",
      "include package entry points",
      "include documented APIs",
    ],
    prioritize: [
      "exported functions",
      "public classes",
      "package entry points",
      "documented APIs",
      "examples that map to internals",
    ],
    avoid: ["private implementation unless necessary"],
    outcomeLabel: "Learn the public API",
  },
  {
    id: "focus-architecture",
    label: "Focus on architecture",
    bestFor: "Mapping project layers and dependencies.",
    bullets: [
      "show module boundaries",
      "include abstractions",
      "show dependency direction",
      "include service/registry layers",
    ],
    prioritize: [
      "module boundaries",
      "abstractions",
      "dependency direction",
      "registries",
      "services",
      "interfaces",
    ],
    avoid: ["leaf utilities"],
    outcomeLabel: "Focus on architecture",
  },
  {
    id: "focus-tests",
    label: "Focus on tests",
    bestFor: "Understanding behavior through examples.",
    bullets: [
      "pick high-signal tests",
      "include test setup helpers",
      "favor integration tests",
      "pick behavior-focused cases",
    ],
    prioritize: [
      "high-signal tests",
      "test setup helpers",
      "integration tests",
      "behavior-focused cases",
    ],
    avoid: ["snapshots", "fixtures", "repetitive generated tests"],
    outcomeLabel: "Focus on tests",
  },
  {
    id: "focus-performance",
    label: "Focus on performance-sensitive code",
    bestFor: "Hot paths, schedulers, caches.",
    bullets: [
      "include parsers",
      "include schedulers",
      "include caches",
      "include tight loops",
      "include async coordination",
    ],
    prioritize: [
      "parsers",
      "schedulers",
      "caches",
      "tight loops",
      "workers",
      "model execution",
      "async coordination",
    ],
    avoid: ["broad files unless necessary"],
    outcomeLabel: "Focus on performance-sensitive code",
  },
  {
    id: "focus-data-model",
    label: "Focus on data model",
    bestFor: "Understanding the domain objects.",
    bullets: [
      "include schemas",
      "include core classes",
      "include model definitions",
      "include serializers and validators",
    ],
    prioritize: [
      "schemas",
      "core classes",
      "model definitions",
      "serializers",
      "validators",
      "persistence boundaries",
    ],
    avoid: ["unrelated UI", "scripting helpers"],
    outcomeLabel: "Focus on data model",
  },
  {
    id: "focus-ui",
    label: "Focus on UI components",
    bestFor: "Frontend repos.",
    bullets: [
      "include root components",
      "include layout components",
      "include stateful components",
      "include design-system primitives",
    ],
    prioritize: [
      "root components",
      "layout components",
      "stateful components",
      "interaction-heavy components",
      "design-system primitives",
    ],
    avoid: ["pure styles", "iconography files"],
    outcomeLabel: "Focus on UI components",
  },
  {
    id: "focus-build",
    label: "Focus on build/tooling",
    bestFor: "Build tools and CLIs.",
    bullets: [
      "include CLI surface",
      "include config",
      "include build pipeline",
      "include plugin transforms",
    ],
    prioritize: [
      "CLI",
      "config",
      "build pipeline",
      "plugins",
      "transforms",
      "bundling",
      "task orchestration",
    ],
    avoid: ["unrelated tests", "documentation"],
    outcomeLabel: "Focus on build/tooling",
  },
  {
    id: "custom",
    label: "Custom focus",
    bestFor: "Use your own focus — type what you want the LLM to optimize for.",
    bullets: [
      "follow the user's custom focus statement",
      "still prefer functions/classes",
      "still avoid generated code",
    ],
    prioritize: ["whatever the user's custom focus describes"],
    avoid: ["generated code", "vendored code", "minified files"],
    outcomeLabel: "Custom focus",
  },
];

export function getTemplate(id: PromptTemplateId): PromptTemplate {
  const t = PROMPT_TEMPLATES.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown prompt template: ${id}`);
  return t;
}

export type PromptBuildInput = {
  repo: string; // owner/repo, expected validated upstream
  ref?: string;
  templateId: PromptTemplateId;
  customFocus?: string;
};

export const PROMPT_SCHEMA_TEXT = `{
  "version": 1,
  "repo": "owner/repo",
  "ref": "main",
  "title": "string",
  "description": "string",
  "clip": "tidbits | off (optional, default 'tidbits' — one coherent unit (function/class) per item; 'off' = type full files)",
  "items": [
    {
      "level": "file | class | function",
      "path": "string",
      "symbol": "string optional unless function/class without line range",
      "label": "string",
      "startLine": "number optional",
      "endLine": "number optional"
    }
  ]
}`;

/**
 * Generate the full prompt the user copies to paste into an LLM.
 *
 * The prompt is intentionally explicit: it spells out the schema, the
 * "must use real paths/symbols" guardrail, and the typing-practice
 * sizing hint so the LLM doesn't dump huge files.
 */
export function buildPrompt(input: PromptBuildInput): string {
  const t = getTemplate(input.templateId);
  const ref = input.ref?.trim() || "main";
  const outcome =
    t.id === "custom"
      ? `Custom focus: ${input.customFocus?.trim() || "(unspecified — please ask the user)"}`
      : t.outcomeLabel;

  const prioritize = t.prioritize.map((p) => `- ${p}`).join("\n");
  const avoid = t.avoid.map((p) => `- ${p}`).join("\n");

  return `You are generating a CodeType guided typing config.

Repository: ${input.repo}
Ref: ${ref}
Outcome: ${outcome}

Inspect the repository and produce JSON only.

The config should guide a developer through the codebase by making
them type important files, classes, and functions in a useful
learning order.

Schema:
${PROMPT_SCHEMA_TEXT}

Prioritize:
${prioritize}

Avoid:
${avoid}

Rules (default — navigation tour):
- Output valid JSON only — no commentary, no markdown fence.
- Use real paths from the repo.
- Use real symbols from the repo.
- Do not invent paths.
- Do not invent symbols.
- Produce 10 to 15 items. The user is *navigating* the codebase — favor
  breadth (many short stops) over depth (a few long reads).
- Each item should be a single coherent unit — preferably one function
  or one small class. Aim for something readable in one sitting (roughly
  5–60 lines). If the function is huge, pick a smaller helper that
  represents the same idea, or use startLine/endLine to bound a focused
  excerpt — but never chop mid-statement.
- Prefer named symbols (function/class with "symbol") over file items,
  so the user types whole units, not arbitrary slices.
- Order items so a developer can understand the codebase progressively.
- Avoid generated files, lockfiles, vendored code, and minified files.
- Include short labels explaining why each item matters.

If the user explicitly asks for full files instead of a navigation
tour: set top-level "clip": "off" and use file items without
startLine/endLine. The resolver will then type each file in full.
`;
}
