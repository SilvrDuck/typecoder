import { useAppStore, type SessionRecord, type View } from "./useAppStore";
import {
  encodeSession,
  decodeSession,
  type EncodedSession,
  type EncodedSnippetResult,
} from "./urlState";
import { buildHash, parseHash } from "./router";
import { getCurated, type CuratedRepo } from "@/core/config/curated";
import { startCuratedSession } from "@/core/session/sessionStarter";
import { startTyping } from "@/core/typing/typingEngine";
import { calculateMetrics } from "@/core/typing/metrics";
import type { SnippetResult } from "@/core/typing/weakSpots";

/**
 * Bidirectional sync between the app store and the URL hash.
 *
 *  - On bootstrap, parse the hash. Plain views set the view. Session-
 *    bound views (`typing`, `summary`) with `?s=…` decode the payload
 *    and re-resolve the session (fetching from GitHub) before restoring
 *    `cursor` and prior `results`.
 *  - When the store's view or session changes, rewrite the hash via
 *    `history.replaceState` — same tab, no history bloat.
 *
 * Mid-snippet typing state is NOT encoded. Refreshing puts you at the
 * start of the current snippet, with prior snippets' stats preserved.
 */

/**
 * Track the last hash we wrote ourselves. When `hashchange` fires, if
 * the new hash matches our last write we ignore it (we caused it). Any
 * other hash change is the user (back/forward, edit, paste) and we
 * re-bootstrap.
 */
let _lastWrittenHash: string | null = null;

export function installUrlSync() {
  if (typeof window === "undefined") return;

  bootstrap();

  useAppStore.subscribe((state, prev) => {
    const viewChanged = state.view !== prev.view;
    const sessionChanged = state.session !== prev.session;
    if (!viewChanged && !sessionChanged) return;
    // pushState on real view transitions so browser back/forward work;
    // replaceState on session-only updates (cursor change, results
    // accumulating) so the history stack doesn't grow per keystroke.
    writeUrl(state.view, state.session, viewChanged ? "push" : "replace");
  });

  window.addEventListener("hashchange", () => {
    if (window.location.hash === _lastWrittenHash) return;
    bootstrap();
  });
}

function bootstrap() {
  const parsed = parseHash(window.location.hash);
  const store = useAppStore.getState();
  const name = parsed.viewName;

  if (name === null) {
    store.navigate({ name: "landing" });
    return;
  }

  if ((name === "typing" || name === "summary") && parsed.sessionParam) {
    const encoded = decodeSession(parsed.sessionParam);
    if (!encoded) {
      store.navigate({ name: "landing" });
      return;
    }
    void restoreSession(encoded, name);
    return;
  }

  // Session-bound views without a payload, or loading/error (require
  // their own state). Fall back to landing.
  if (
    name === "typing" ||
    name === "summary" ||
    name === "loading" ||
    name === "error"
  ) {
    store.navigate({ name: "landing" });
    return;
  }

  store.navigate({ name });
}

async function restoreSession(
  encoded: EncodedSession,
  viewAfter: "typing" | "summary",
) {
  const store = useAppStore.getState();

  let config;
  let source: string;
  if (encoded.kind === "curated") {
    const curated = getCurated(encoded.id as CuratedRepo["id"]);
    if (!curated) {
      store.navigate({ name: "landing" });
      return;
    }
    store.pickCurated(curated);
    config = curated.config;
    source = curated.name;
  } else {
    config = encoded.config;
    source = encoded.source;
  }

  await startCuratedSession(config, source);

  const after = useAppStore.getState().session;
  if (!after) return;

  const items = after.resolved.items;
  const cursor = clampCursor(encoded.cursor ?? 0, items.length);

  const priorResults: SnippetResult[] = (encoded.results ?? []).map((r, i) => {
    const item = items[i];
    const target = item?.text ?? "";
    const synthState = startTyping(target);
    synthState.completedAt = r.ms;
    return {
      target,
      state: synthState,
      label: r.label,
      path: r.path,
      restoredMetrics: {
        rawWpm: r.wpm,
        codeWpm: r.wpm,
        accuracy: r.acc,
        // The encoded `mistakes` field stores the total (corrected +
        // uncorrected). On restore we no longer know the split, so we
        // approximate by attributing it all to uncorrected. The summary
        // screen reads `mistakes` for the aggregate, which is correct.
        mistakes: r.mistakes,
        correctedMistakes: 0,
        uncorrectedMistakes: r.mistakes,
        elapsedMs: r.ms,
        charsTyped: r.chars,
        progress: 1,
      },
    };
  });

  const restoredItem = items[cursor];
  useAppStore.setState({
    session: {
      ...after,
      cursor,
      results: priorResults,
      typingState: restoredItem ? startTyping(restoredItem.text) : after.typingState,
    },
    view: viewAfter === "summary" ? { name: "summary" } : { name: "typing" },
  });
}

function clampCursor(c: number, len: number): number {
  if (!Number.isFinite(c) || c < 0) return 0;
  if (c >= len) return Math.max(0, len - 1);
  return Math.floor(c);
}

function writeUrl(view: View, session: SessionRecord | null, mode: "push" | "replace") {
  const param = computeSessionParam(view, session);
  const newHash = buildHash(view.name, param);
  if (window.location.hash === newHash) return;
  _lastWrittenHash = newHash;
  if (mode === "push") history.pushState(null, "", newHash);
  else history.replaceState(null, "", newHash);
}

function computeSessionParam(
  view: View,
  session: SessionRecord | null,
): string | undefined {
  if (!session) return undefined;
  if (view.name !== "typing" && view.name !== "summary") return undefined;

  const curated = useAppStore.getState().curated;
  const encoded: EncodedSession = isCuratedSession(curated, session)
    ? {
        kind: "curated",
        id: curated.id,
        cursor: session.cursor,
        results: session.results.map(encodeResult),
      }
    : {
        kind: "config",
        config: session.config,
        source: session.source,
        cursor: session.cursor,
        results: session.results.map(encodeResult),
      };
  return encodeSession(encoded);
}

/**
 * Identity check: curated cards reuse the same config object when
 * calling startCuratedSession, so identity holds for genuine curated
 * sessions. Paste/build paths produce fresh config objects.
 *
 * Used by both writeUrl and the share button so they cannot disagree
 * for the same session.
 */
function isCuratedSession(
  curated: CuratedRepo | null,
  session: SessionRecord,
): curated is CuratedRepo {
  return !!curated && curated.config === session.config;
}

function encodeResult(r: SnippetResult): EncodedSnippetResult {
  const m =
    r.restoredMetrics ?? calculateMetrics(r.state, r.state.completedAt ?? Date.now());
  return {
    wpm: Math.round(m.codeWpm),
    acc: Number(m.accuracy.toFixed(3)),
    ms: m.elapsedMs,
    chars: m.charsTyped,
    // m.mistakes = uncorrected + corrected (total ever). The summary
    // screen aggregates this field, so persist the same total to keep
    // restored sessions consistent with live ones.
    mistakes: m.mistakes,
    label: r.label,
    path: r.path ?? "",
  };
}

/**
 * Build a config-only URL (cursor=0, no results) for the share button.
 * Always rebuilds from the current session; throws if there is no
 * session to share.
 */
export function buildShareUrlForCurrentSession(): string {
  const state = useAppStore.getState();
  const session = state.session;
  if (!session) throw new Error("No active session to share.");

  const curated = state.curated;
  const encoded: EncodedSession = isCuratedSession(curated, session)
    ? { kind: "curated", id: curated.id }
    : { kind: "config", config: session.config, source: session.source };

  const param = encodeSession(encoded);
  const hash = buildHash("typing", param);
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}${hash}`;
}
