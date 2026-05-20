/**
 * Built-in demo repo. Tiny original code, bundled with the app for
 * offline development, Playwright tests, and a fallback when GitHub is
 * unreachable or rate-limited.
 *
 * This is the ONE exception to the "no third-party source bundled" rule
 * — these files are original to CodeType.
 */

export type DemoFile = {
  path: string;
  language: string;
  text: string;
};

export const DEMO_REPO = "demo/tiny-codebase";
export const DEMO_REF = "main";

export const DEMO_FILES: DemoFile[] = [
  {
    path: "src/scheduler.ts",
    language: "TypeScript",
    text: `export type Task = {
  id: string;
  run: () => Promise<void>;
};

export class Scheduler {
  private queue: Task[] = [];
  private running = false;

  enqueue(task: Task): void {
    this.queue.push(task);
    if (!this.running) void this.drain();
  }

  private async drain(): Promise<void> {
    this.running = true;
    while (this.queue.length > 0) {
      const next = this.queue.shift()!;
      try {
        await next.run();
      } catch (err) {
        console.error(\`task \${next.id} failed\`, err);
      }
    }
    this.running = false;
  }
}
`,
  },
  {
    path: "src/parser.py",
    language: "Python",
    text: `from dataclasses import dataclass
from typing import Iterable

@dataclass
class Token:
    kind: str
    value: str
    pos: int

def tokenize(source: str) -> Iterable[Token]:
    i = 0
    while i < len(source):
        ch = source[i]
        if ch.isspace():
            i += 1
            continue
        if ch.isalpha():
            j = i + 1
            while j < len(source) and source[j].isalnum():
                j += 1
            yield Token("ident", source[i:j], i)
            i = j
        else:
            yield Token("punct", ch, i)
            i += 1
`,
  },
  {
    path: "src/ring_buffer.rs",
    language: "Rust",
    text: `pub struct RingBuffer<T> {
    buf: Vec<Option<T>>,
    head: usize,
    tail: usize,
}

impl<T> RingBuffer<T> {
    pub fn new(capacity: usize) -> Self {
        let mut buf = Vec::with_capacity(capacity);
        for _ in 0..capacity { buf.push(None); }
        Self { buf, head: 0, tail: 0 }
    }

    pub fn push(&mut self, value: T) -> Option<T> {
        let prev = self.buf[self.tail].take();
        self.buf[self.tail] = Some(value);
        self.tail = (self.tail + 1) % self.buf.len();
        prev
    }

    pub fn pop(&mut self) -> Option<T> {
        let v = self.buf[self.head].take();
        if v.is_some() {
            self.head = (self.head + 1) % self.buf.len();
        }
        v
    }
}
`,
  },
];

export function makeDemoTreeEntries() {
  return DEMO_FILES.map((f) => ({
    path: f.path,
    type: "blob" as const,
    sha: f.path,
    size: f.text.length,
  }));
}

export function findDemoFile(path: string): DemoFile | undefined {
  return DEMO_FILES.find((f) => f.path === path);
}
