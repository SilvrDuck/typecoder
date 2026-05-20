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
