import { describe, it, expect } from "vitest";
import { CURATED_REPOS, getCurated } from "./curated";
import { validateConfig } from "./schema";

describe("curated configs", () => {
  it("has linux, vscode, and fastapi", () => {
    const ids = CURATED_REPOS.map((c) => c.id).sort();
    expect(ids).toEqual(["fastapi", "linux", "vscode"]);
  });

  it("each curated config conforms to the schema", () => {
    for (const c of CURATED_REPOS) {
      expect(validateConfig(c.config).ok).toBe(true);
    }
  });

  it("does not bundle any third-party source code in items[].text", () => {
    // Configs reference paths and symbols only — content is fetched in-browser.
    for (const c of CURATED_REPOS) {
      const json = JSON.stringify(c.config);
      // No real source text should leak in (no semicolons inside paths
      // for example), and no field called 'text' / 'content' should exist.
      expect(json).not.toMatch(/"(text|content|source|body)":/);
    }
  });

  it("getCurated returns by id", () => {
    expect(getCurated("linux")?.config.repo).toBe("torvalds/linux");
    expect(getCurated("vscode")?.config.repo).toBe("microsoft/vscode");
    expect(getCurated("fastapi")?.config.repo).toBe("fastapi/fastapi");
  });

  it("each config has at least 4 items", () => {
    for (const c of CURATED_REPOS) {
      expect(c.config.items.length).toBeGreaterThanOrEqual(4);
    }
  });
});
