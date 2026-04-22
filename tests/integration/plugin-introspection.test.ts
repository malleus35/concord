import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { introspectPlugin } from "../../src/plugin/capability.js";

describe("E2E: plugin introspection (POC-5)", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-pi-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("Claude plugin: skills+mcp detected, hooks na", async () => {
    await writeFile(join(tmp, "plugin.json"), JSON.stringify({
      name: "demo", version: "1.0.0", skills: ["a", "b"], mcp_servers: ["m"],
    }));
    const cap = await introspectPlugin(tmp, "claude-code");
    expect(cap.byAssetType.skills.status).toBe("supported");
    expect(cap.byAssetType.skills.count).toBe(2);
    expect(cap.byAssetType.hooks.status).toBe("na");
  });

  it("Codex plugin: .codex-plugin/plugin.json", async () => {
    const cp = join(tmp, ".codex-plugin");
    await mkdir(cp, { recursive: true });
    await writeFile(join(cp, "plugin.json"), JSON.stringify({ name: "c", version: "0.1.0", hooks: ["h"] }));
    const cap = await introspectPlugin(tmp, "codex");
    expect(cap.byAssetType.hooks.status).toBe("supported");
  });

  it("OpenCode plugin: package.json with opencode.skills", async () => {
    await writeFile(join(tmp, "package.json"), JSON.stringify({
      name: "oc", version: "1.0.0", main: "index.js", opencode: { skills: ["s"] },
    }));
    const cap = await introspectPlugin(tmp, "opencode");
    expect(cap.byAssetType.skills.status).toBe("supported");
  });

  it("no plugin.json → failed with PluginJsonMissing", async () => {
    const cap = await introspectPlugin(tmp, "claude-code");
    expect(cap.byAssetType.skills.status).toBe("failed");
    expect(cap.byAssetType.skills.reason).toBe("PluginJsonMissing");
  });
});
