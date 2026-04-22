import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readPlugin } from "../../src/plugin/registry.js";

describe("readPlugin (registry)", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-reg-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("routes claude-code to readClaudePlugin", async () => {
    await writeFile(join(tmp, "plugin.json"), JSON.stringify({ name: "c", version: "1.0.0" }));
    const p = await readPlugin(tmp, "claude-code");
    expect(p).not.toBeNull();
    expect(p!.provider).toBe("claude-code");
  });

  it("routes codex to readCodexPlugin", async () => {
    const dir = join(tmp, ".codex-plugin");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "plugin.json"), JSON.stringify({ name: "cx", version: "0.1.0" }));
    const p = await readPlugin(tmp, "codex");
    expect(p).not.toBeNull();
    expect(p!.provider).toBe("codex");
  });

  it("routes opencode to readOpenCodePlugin", async () => {
    await writeFile(join(tmp, "package.json"), JSON.stringify({ name: "oc", version: "1.0.0", main: "i.js" }));
    const p = await readPlugin(tmp, "opencode");
    expect(p).not.toBeNull();
    expect(p!.provider).toBe("opencode");
  });

  it("missing manifest → null regardless of provider", async () => {
    expect(await readPlugin(tmp, "claude-code")).toBeNull();
    expect(await readPlugin(tmp, "codex")).toBeNull();
    expect(await readPlugin(tmp, "opencode")).toBeNull();
  });
});
