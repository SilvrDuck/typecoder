import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "./App";

describe("App", () => {
  it("renders landing with CodeType mark", () => {
    render(<App />);
    expect(screen.getByText(/CodeType/i)).toBeInTheDocument();
    expect(screen.getByText(/Type real code/i)).toBeInTheDocument();
  });
});
