import { describe, it, expect, afterEach } from "vitest";
import { checkGitBash } from "../../../src/sync/preflight/git-bash.js";

describe("checkGitBash", () => {
  const originalPlatform = process.platform;
  const originalEnv = process.env.CLAUDE_CODE_GIT_BASH_PATH;
  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform });
    if (originalEnv !== undefined) process.env.CLAUDE_CODE_GIT_BASH_PATH = originalEnv;
    else delete process.env.CLAUDE_CODE_GIT_BASH_PATH;
  });

  it("non-Windows → applicable=false", async () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    const r = await checkGitBash();
    expect(r.applicable).toBe(false);
  });

  it("Windows + env set → found=true, path reported", async () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    process.env.CLAUDE_CODE_GIT_BASH_PATH = "C:/Program Files/Git/bin/bash.exe";
    const r = await checkGitBash();
    expect(r.applicable).toBe(true);
    expect(r.found).toBe(true);
    expect(r.path).toBe("C:/Program Files/Git/bin/bash.exe");
  });

  it("Windows + env missing → not found, remediation hint", async () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    delete process.env.CLAUDE_CODE_GIT_BASH_PATH;
    const r = await checkGitBash();
    expect(r.applicable).toBe(true);
    expect(r.found).toBe(false);
    expect(r.remediation).toContain("CLAUDE_CODE_GIT_BASH_PATH");
  });
});
