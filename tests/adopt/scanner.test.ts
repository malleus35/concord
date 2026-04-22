import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanScopeForCandidates } from "../../src/adopt/scanner.js";

describe("adopt scanner", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-adopt-scan-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("finds claude-code project skills", async () => {
    await mkdir(join(tmp, ".claude", "skills", "code-reviewer"), { recursive: true });
    await writeFile(join(tmp, ".claude", "skills", "code-reviewer", "SKILL.md"), "---\nname: code-reviewer\n---\nbody");
    const candidates = await scanScopeForCandidates("project", { concordHome: tmp, cwd: tmp });
    const found = candidates.find((c) => c.id === "claude-code:skills:code-reviewer");
    expect(found).toBeDefined();
    expect(found!.assetType).toBe("skills");
    expect(found!.provider).toBe("claude-code");
    expect(found!.scope).toBe("project");
  });

  it("ignores hidden files and .DS_Store", async () => {
    await mkdir(join(tmp, ".claude", "skills", ".hidden"), { recursive: true });
    await writeFile(join(tmp, ".claude", "skills", ".DS_Store"), "x");
    const candidates = await scanScopeForCandidates("project", { concordHome: tmp, cwd: tmp });
    expect(candidates.find((c) => c.id.includes(".hidden"))).toBeUndefined();
    expect(candidates.find((c) => c.id.includes(".DS_Store"))).toBeUndefined();
  });

  it("finds user-scope codex skills at <userHome>/.agents/skills", async () => {
    await mkdir(join(tmp, ".agents", "skills", "commit-msg"), { recursive: true });
    await writeFile(join(tmp, ".agents", "skills", "commit-msg", "SKILL.md"), "---\nname: commit-msg\n---\n");
    const candidates = await scanScopeForCandidates("user", {
      concordHome: tmp,
      cwd: process.cwd(),
      userHome: tmp,
    });
    const found = candidates.find((c) => c.id === "codex:skills:commit-msg");
    expect(found).toBeDefined();
    expect(found!.provider).toBe("codex");
  });

  it("enterprise scope returns empty array (Phase 1)", async () => {
    const candidates = await scanScopeForCandidates("enterprise", { concordHome: tmp, cwd: tmp });
    expect(candidates).toEqual([]);
  });

  it("missing root paths do not throw", async () => {
    const candidates = await scanScopeForCandidates("project", { concordHome: tmp, cwd: tmp });
    expect(candidates).toEqual([]);
  });
});
