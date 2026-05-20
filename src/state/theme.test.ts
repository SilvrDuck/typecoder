import { describe, it, expect, beforeEach, vi } from "vitest";
import { resolveInitialTheme, applyTheme, persistTheme } from "./theme";

const LS_KEY = "codetype:theme";

describe("theme", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    vi.restoreAllMocks();
  });

  it("resolves stored preference first", () => {
    window.localStorage.setItem(LS_KEY, "light");
    expect(resolveInitialTheme()).toBe("light");

    window.localStorage.setItem(LS_KEY, "dark");
    expect(resolveInitialTheme()).toBe("dark");
  });

  it("falls back to prefers-color-scheme when no stored preference", () => {
    vi.spyOn(window, "matchMedia").mockImplementation((q) => {
      return {
        matches: q === "(prefers-color-scheme: light)",
        media: q,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      } as MediaQueryList;
    });
    expect(resolveInitialTheme()).toBe("light");
  });

  it("defaults to dark with no signal", () => {
    vi.spyOn(window, "matchMedia").mockImplementation(() => ({
      matches: false,
      media: "",
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList);
    expect(resolveInitialTheme()).toBe("dark");
  });

  it("ignores junk localStorage values", () => {
    window.localStorage.setItem(LS_KEY, "lavender");
    // Falls through to matchMedia; default mock returns matches:false
    // so we get dark.
    expect(resolveInitialTheme()).toBe("dark");
  });

  it("applyTheme writes data-theme on documentElement", () => {
    applyTheme("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    applyTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("persistTheme writes to localStorage", () => {
    persistTheme("light");
    expect(window.localStorage.getItem(LS_KEY)).toBe("light");
  });
});
