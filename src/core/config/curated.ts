import linux from "@/curated/linux.json";
import vscode from "@/curated/vscode.json";
import fastapi from "@/curated/fastapi.json";
import { validateConfig, type CodeTypeConfig } from "./schema";

export type CuratedRepo = {
  id: "linux" | "vscode" | "fastapi";
  name: string;
  language: string;
  blurb: string;
  repo: string;
  config: CodeTypeConfig;
};

function ensureValid(id: string, raw: unknown): CodeTypeConfig {
  const r = validateConfig(raw);
  if (!r.ok) {
    const msgs = r.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
    throw new Error(`Curated config "${id}" is invalid: ${msgs}`);
  }
  return r.value;
}

export const CURATED_REPOS: CuratedRepo[] = [
  {
    id: "linux",
    name: "Linux kernel",
    language: "C",
    blurb: "Trace process, memory, and filesystem internals.",
    repo: "torvalds/linux",
    config: ensureValid("linux", linux),
  },
  {
    id: "vscode",
    name: "VS Code",
    language: "TypeScript",
    blurb: "Follow commands, extensions, services, and workbench flow.",
    repo: "microsoft/vscode",
    config: ensureValid("vscode", vscode),
  },
  {
    id: "fastapi",
    name: "FastAPI",
    language: "Python",
    blurb: "Follow routing, validation, dependency injection, and request handling.",
    repo: "fastapi/fastapi",
    config: ensureValid("fastapi", fastapi),
  },
];

export function getCurated(id: CuratedRepo["id"]): CuratedRepo | undefined {
  return CURATED_REPOS.find((c) => c.id === id);
}
