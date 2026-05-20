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

  it("navigates to custom hub with all three cards", () => {
    render(<App />);
    fireEvent.click(screen.getByTestId("landing-custom"));
    expect(screen.getByRole("heading", { name: /Custom session/i })).toBeInTheDocument();
    expect(screen.getByTestId("custom-paste")).toBeInTheDocument();
    expect(screen.getByTestId("custom-prompt")).toBeInTheDocument();
    expect(screen.getByTestId("custom-load")).toBeInTheDocument();
  });

  it("back from a custom sub-screen returns to custom hub", () => {
    render(<App />);
    fireEvent.click(screen.getByTestId("landing-custom"));
    fireEvent.click(screen.getByTestId("custom-paste"));
    fireEvent.click(screen.getByText(/Back/i));
    expect(screen.getByRole("heading", { name: /Custom session/i })).toBeInTheDocument();
  });
});
