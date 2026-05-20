import { CodeTypeConfigSchema, type CodeTypeConfig } from "@/core/config/schema";

/**
 * Per-snippet summary safe to put in a URL: only what's needed to render
 * the session summary screen without re-running the typing engine.
 */
export type EncodedSnippetResult = {
  wpm: number;
  acc: number; // 0..1
  ms: number;
  chars: number;
  mistakes: number;
  label: string;
  path: string;
};

export type EncodedSession =
  | {
      kind: "curated";
      id: string;
      cursor?: number;
      results?: EncodedSnippetResult[];
    }
  | {
      kind: "config";
      config: CodeTypeConfig;
      source: string;
      cursor?: number;
      results?: EncodedSnippetResult[];
    };

/**
 * URL-safe base64. Encoded value is JSON.stringify-then-base64url, so any
 * UTF-8 content (including non-ASCII source identifiers) round-trips.
 */
export function encodeSession(s: EncodedSession): string {
  return base64UrlEncode(JSON.stringify(s));
}

/**
 * Decode and validate. For `kind: "config"` the embedded config is
 * re-validated through the same Zod schema used everywhere else — a
 * crafted URL must not be able to inject an arbitrarily-shaped config
 * object into the app.
 */
export function decodeSession(s: string): EncodedSession | null {
  try {
    const json = base64UrlDecode(s);
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return null;
    const obj = parsed as { kind?: unknown };
    if (obj.kind === "curated") {
      const o = parsed as { id?: unknown };
      if (typeof o.id !== "string") return null;
      return parsed as EncodedSession;
    }
    if (obj.kind === "config") {
      const o = parsed as { config?: unknown; source?: unknown };
      if (typeof o.source !== "string") return null;
      const v = CodeTypeConfigSchema.safeParse(o.config);
      if (!v.success) return null;
      return {
        ...(parsed as EncodedSession & { kind: "config" }),
        config: v.data as CodeTypeConfig,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function base64UrlEncode(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlDecode(s: string): string {
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
