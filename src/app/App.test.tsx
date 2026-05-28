import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { App } from "./App";
import { useAppStore } from "@/state/useAppStore";

beforeEach(() => {
  useAppStore.getState().resetAll();
});

describe("App", () => {
  it("renders landing with CodeType mark", () => {
    render(<App />);
    expect(screen.getAllByText(/CodeType/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/Type real code/i)).toBeInTheDocument();
  });

  it("navigates to type-right-away on button click", () => {
    render(<App />);
    fireEvent.click(screen.getByTestId("landing-type-right-away"));
    expect(screen.getByText(/Pick a codebase/i)).toBeInTheDocument();
  });

  it("renders the three curated cards", () => {
    render(<App />);
    fireEvent.click(screen.getByTestId("landing-type-right-away"));
    expect(screen.getByRole("heading", { name: /Linux kernel/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /VS Code/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /FastAPI/i })).toBeInTheDocument();
    expect(screen.getByTestId("curated-start-linux")).toBeInTheDocument();
    expect(screen.getByTestId("curated-start-vscode")).toBeInTheDocument();
    expect(screen.getByTestId("curated-start-fastapi")).toBeInTheDocument();
  });

  it("navigates to custom hub with all three flows on one page", () => {
    render(<App />);
    fireEvent.click(screen.getByTestId("landing-custom"));
    expect(screen.getByRole("heading", { name: /Custom session/i })).toBeInTheDocument();
    // 1) Load-any-repo input is present
    expect(screen.getByTestId("lar-input")).toBeInTheDocument();
    // 2) Prompt-builder is always visible (no toggle) and inherits the repo
    expect(screen.getByTestId("pb-preview")).toBeInTheDocument();
    expect(screen.getByTestId("pb-repo-inherited")).toBeInTheDocument();
    // 3) Paste-config textarea is present
    expect(screen.getByTestId("paste-textarea")).toBeInTheDocument();
  });

  it("clicking the Mark on the custom hub returns to landing", () => {
    render(<App />);
    fireEvent.click(screen.getByTestId("landing-custom"));
    expect(
      screen.getByRole("heading", { name: /Custom session/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Go to landing/i));
    expect(screen.getByText(/Type real code/i)).toBeInTheDocument();
  });
});
