import { create } from "zustand";
import type { CodeTypeConfig } from "@/core/config/schema";
import type {
  ResolvedSession,
  ResolvedItem,
} from "@/core/config/resolveConfig";
import type {
  TypingState,
} from "@/core/typing/typingEngine";
import { startTyping } from "@/core/typing/typingEngine";
import type { CuratedRepo } from "@/core/config/curated";
import type { SnippetResult } from "@/core/typing/weakSpots";
import { applyTheme, persistTheme, resolveInitialTheme, type Theme } from "./theme";

/**
 * App-wide client state. No persistence — refresh wipes everything,
 * which is the privacy contract for CodeType.
 */

export type View =
  | { name: "landing" }
  | { name: "type-right-away" }
  | { name: "custom-hub" }
  | { name: "paste-config" }
  | { name: "prompt-builder" }
  | { name: "load-any-repo" }
  | { name: "loading"; title: string }
  | { name: "typing" }
  | { name: "summary" }
  | { name: "error"; title: string; detail?: string };

export type SessionRecord = {
  config: CodeTypeConfig;
  resolved: ResolvedSession;
  cursor: number; // index into resolved.items
  typingState: TypingState;
  results: SnippetResult[];
  /** Source label shown in the breadcrumb. */
  source: string;
};

type State = {
  view: View;
  curated: CuratedRepo | null;
  session: SessionRecord | null;
  // Form drafts (live across navigation so the user doesn't lose work)
  pastedConfigText: string;
  promptBuilder: {
    repo: string;
    ref: string;
    templateId: string;
    customFocus: string;
  };
  loadAnyRepo: {
    input: string;
  };
  theme: Theme;
};

type Actions = {
  navigate: (view: View) => void;
  back: () => void;

  pickCurated: (c: CuratedRepo) => void;
  startSession: (
    config: CodeTypeConfig,
    resolved: ResolvedSession,
    source: string,
  ) => void;

  setPastedConfigText: (s: string) => void;
  setPromptBuilder: (patch: Partial<State["promptBuilder"]>) => void;
  setLoadAnyRepo: (patch: Partial<State["loadAnyRepo"]>) => void;

  setTypingState: (s: TypingState) => void;
  /** Commit current item result, advance cursor, reset typing for next. */
  advanceItem: (snippet: SnippetResult) => void;
  /**
   * Move back to the previous session item without recording a result.
   * Discards any in-flight typing on the current item. No-op at cursor 0.
   */
  goToPreviousItem: () => void;
  restartCurrentItem: () => void;
  resetAll: () => void;

  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const INITIAL: State = {
  view: { name: "landing" },
  curated: null,
  session: null,
  pastedConfigText: "",
  promptBuilder: {
    repo: "",
    ref: "main",
    templateId: "trace-execution",
    customFocus: "",
  },
  loadAnyRepo: { input: "" },
  theme: resolveInitialTheme(),
};

export const useAppStore = create<State & Actions>()((set, get) => ({
  ...INITIAL,

  // Dev/Playwright drive-by hook. Gated to non-production builds so the
  // store shape is not leaked on the deployed static site.
  ...((): object => {
    if (typeof window !== "undefined" && import.meta.env.DEV) {
      queueMicrotask(() => {
        // @ts-expect-error window hook
        (window as Window).__codetype = {
          state: () => useAppStore.getState(),
          reset: () => useAppStore.getState().resetAll(),
        };
      });
    }
    return {};
  })(),

  navigate: (view) => set({ view }),
  back: () => {
    const name = get().view.name;
    if (
      name === "type-right-away" ||
      name === "custom-hub" ||
      name === "error"
    ) {
      set({ view: { name: "landing" } });
    } else if (
      name === "paste-config" ||
      name === "prompt-builder" ||
      name === "load-any-repo"
    ) {
      set({ view: { name: "custom-hub" } });
    } else if (name === "summary" || name === "typing" || name === "loading") {
      set({ view: { name: "landing" } });
    } else {
      set({ view: { name: "landing" } });
    }
  },

  pickCurated: (c) => set({ curated: c }),
  startSession: (config, resolved, source) => {
    const first = resolved.items[0];
    if (!first) {
      set({
        view: {
          name: "error",
          title: "Nothing to type",
          detail: resolved.errors[0]?.message ?? "No items resolved.",
        },
      });
      return;
    }
    set({
      session: {
        config,
        resolved,
        cursor: 0,
        typingState: startTyping(first.text),
        results: [],
        source,
      },
      view: { name: "typing" },
    });
  },

  setPastedConfigText: (s) => set({ pastedConfigText: s }),
  setPromptBuilder: (patch) =>
    set((s) => ({ promptBuilder: { ...s.promptBuilder, ...patch } })),
  setLoadAnyRepo: (patch) =>
    set((s) => ({ loadAnyRepo: { ...s.loadAnyRepo, ...patch } })),

  setTypingState: (typingState) => {
    const s = get().session;
    if (!s) return;
    set({ session: { ...s, typingState } });
  },

  advanceItem: (snippet) => {
    const s = get().session;
    if (!s) return;
    const nextCursor = s.cursor + 1;
    const next: ResolvedItem | undefined = s.resolved.items[nextCursor];
    if (!next) {
      set({
        session: {
          ...s,
          cursor: nextCursor,
          results: [...s.results, snippet],
        },
        view: { name: "summary" },
      });
      return;
    }
    set({
      session: {
        ...s,
        cursor: nextCursor,
        results: [...s.results, snippet],
        typingState: startTyping(next.text),
      },
    });
  },

  goToPreviousItem: () => {
    const s = get().session;
    if (!s) return;
    if (s.cursor <= 0) return;
    const prevCursor = s.cursor - 1;
    const prev = s.resolved.items[prevCursor];
    if (!prev) return;
    set({
      session: {
        ...s,
        cursor: prevCursor,
        // Drop the most recent committed result so it's not double-counted
        // if the user re-completes the item.
        results: s.results.slice(0, prevCursor),
        typingState: startTyping(prev.text),
      },
    });
  },

  restartCurrentItem: () => {
    const s = get().session;
    if (!s) return;
    const cur = s.resolved.items[s.cursor];
    if (!cur) return;
    set({ session: { ...s, typingState: startTyping(cur.text) } });
  },

  resetAll: () => {
    const theme = get().theme;
    set({ ...INITIAL, view: { name: "landing" }, theme });
  },

  setTheme: (theme) => {
    applyTheme(theme);
    persistTheme(theme);
    set({ theme });
  },
  toggleTheme: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    applyTheme(next);
    persistTheme(next);
    set({ theme: next });
  },
}));
