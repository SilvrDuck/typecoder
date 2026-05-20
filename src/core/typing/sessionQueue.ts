/**
 * A session is an ordered list of typing items. The queue tracks which is
 * active and accumulates results.
 */

import type { TypingState } from "./typingEngine";

export type SessionItem = {
  id: string;
  label: string;
  text: string;
  path?: string;
  symbol?: string;
  level?: "file" | "class" | "function";
  language?: string;
  whyItMatters?: string;
};

export type SessionResult = {
  itemId: string;
  state: TypingState;
};

export type Session = {
  id: string;
  title: string;
  description?: string;
  items: SessionItem[];
  cursor: number;
  results: SessionResult[];
};

export function nextItem(session: Session): SessionItem | undefined {
  return session.items[session.cursor];
}

export function advance(session: Session, result: SessionResult): Session {
  return {
    ...session,
    cursor: Math.min(session.cursor + 1, session.items.length),
    results: [...session.results, result],
  };
}

export function isSessionComplete(session: Session): boolean {
  return session.cursor >= session.items.length;
}

export function restartItem(session: Session): Session {
  // No-op on queue; the typing state restart is handled by the caller.
  return session;
}
