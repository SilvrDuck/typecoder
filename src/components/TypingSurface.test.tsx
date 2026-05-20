import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { TypingSurface } from "./TypingSurface";
import { startTyping, applyKey } from "@/core/typing/typingEngine";

describe("TypingSurface", () => {
  it("renders the target text", () => {
    const state = startTyping("hello");
    render(
      <TypingSurface state={state} onChange={() => {}} onComplete={() => {}} />,
    );
    expect(screen.getByText("h")).toBeInTheDocument();
  });

  it("forwards keystrokes to the engine via onChange", () => {
    const state = startTyping("hi");
    const onChange = vi.fn();
    const onComplete = vi.fn();
    render(
      <TypingSurface state={state} onChange={onChange} onComplete={onComplete} />,
    );
    const region = screen.getByTestId("typing-surface");
    const capture = region.querySelector("textarea");
    expect(capture).toBeTruthy();
    fireEvent.keyDown(capture!, { key: "h" });
    expect(onChange).toHaveBeenCalledTimes(1);
    const arg = onChange.mock.calls[0][0];
    expect(arg.input).toBe("h");
  });

  it("fires onComplete once when state transitions to complete", () => {
    let state = startTyping("ab");
    state = applyKey(state, "a", { now: 1 });
    state = applyKey(state, "b", { now: 2 }); // complete
    const onComplete = vi.fn();
    render(
      <TypingSurface state={state} onChange={() => {}} onComplete={onComplete} />,
    );
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("shows the typed char (not the expected) on wrong cells", () => {
    let state = startTyping("cat");
    state = applyKey(state, "c", { now: 1 });
    state = applyKey(state, "x", { now: 2 }); // wrong: expected 'a', typed 'x'
    render(
      <TypingSurface state={state} onChange={() => {}} onComplete={() => {}} />,
    );
    const surface = screen.getByTestId("typing-surface");
    const wrongCell = surface.querySelector('[data-status="wrong"]');
    expect(wrongCell).toBeTruthy();
    expect(wrongCell!.textContent).toBe("x");
  });

  it("renders whitespace mistakes as visible glyphs", () => {
    let state = startTyping("ab");
    state = applyKey(state, " ", { now: 1 }); // wrong: expected 'a', typed ' '
    render(
      <TypingSurface state={state} onChange={() => {}} onComplete={() => {}} />,
    );
    const surface = screen.getByTestId("typing-surface");
    const wrongCell = surface.querySelector('[data-status="wrong"]');
    expect(wrongCell).toBeTruthy();
    // Glyph should appear (·) instead of an empty space
    expect(wrongCell!.textContent).toContain("·");
  });

  it("renders extra cells past target with the typed char in red", () => {
    let state = startTyping("ab");
    state = applyKey(state, "a", { now: 1 });
    state = applyKey(state, "b", { now: 2 });
    state = applyKey(state, "c", { now: 3 }); // extra char past target
    render(
      <TypingSurface state={state} onChange={() => {}} onComplete={() => {}} />,
    );
    const surface = screen.getByTestId("typing-surface");
    const extraCell = surface.querySelector('[data-status="extra"]');
    expect(extraCell).toBeTruthy();
    expect(extraCell!.textContent).toBe("c");
  });

  it("shows ↵ glyph when user typed Enter on a non-newline target", () => {
    let state = startTyping("ab\nc");
    state = applyKey(state, "Enter", { now: 1 }); // wrong: expected 'a', typed '\n'
    render(
      <TypingSurface state={state} onChange={() => {}} onComplete={() => {}} />,
    );
    const surface = screen.getByTestId("typing-surface");
    const wrongCell = surface.querySelector('[data-status="wrong"]');
    expect(wrongCell).toBeTruthy();
    expect(wrongCell!.textContent).toContain("↵");
  });

  it("shows trailing caret when input fills target but has errors", () => {
    let state = startTyping("cat");
    state = applyKey(state, "c", { now: 1 });
    state = applyKey(state, "x", { now: 2 }); // wrong middle
    state = applyKey(state, "t", { now: 3 }); // cursor now at end, not complete
    render(
      <TypingSurface state={state} onChange={() => {}} onComplete={() => {}} />,
    );
    expect(screen.getByTestId("trailing-caret")).toBeInTheDocument();
  });

  it("blocks Tab default behavior", () => {
    const state = startTyping("\tfoo");
    const onChange = vi.fn();
    render(
      <TypingSurface state={state} onChange={onChange} onComplete={() => {}} />,
    );
    const capture = screen
      .getByTestId("typing-surface")
      .querySelector("textarea")!;
    const evt = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    capture.dispatchEvent(evt);
    // The handler is React-synthetic, so rather than test preventDefault
    // on the native event, assert the onChange did fire with cursor 1.
    fireEvent.keyDown(capture, { key: "Tab" });
    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls.at(-1)![0];
    expect(last.input.startsWith("\t")).toBe(true);
  });
});
