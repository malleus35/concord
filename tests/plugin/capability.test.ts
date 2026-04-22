import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { introspectPlugin } from "../../src/plugin/capability.js";

describe("introspectPlugin", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-ip-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("Claude plugin with skills+mcp → supported for those, na for rest", async () => {
    await writeFile(
      join(tmp, "plugin.json"),
      JSON.stringify({ name: "x", version: "1.0.0", skills: ["a"], mcp_servers: ["m"] }),
    );
    const cap = await introspectPlugin(tmp, "claude-code");
    expect(cap.byAssetType.skills.status).toBe("supported");
    expect(cap.byAssetType.mcp_servers.status).toBe("supported");
    expect(cap.byAssetType.hooks.status).toBe("na");
    expect(cap.byAssetType.instructions.status).toBe("na");
  });

  it("plugin.json missing → capability matrix all failed with reason PluginJsonMissing", async () => {
    const cap = await introspectPlugin(tmp, "claude-code");
    expect(cap.byAssetType.skills.status).toBe("failed");
    expect(cap.byAssetType.skills.reason).toBe("PluginJsonMissing");
  });

  it("OpenCode plugin (package.json + opencode.skills) → supported", async () => {
    await writeFile(
      join(tmp, "package.json"),
      JSON.stringify({ name: "x", version: "1.0.0", main: "index.js", opencode: { skills: ["a"] } }),
    );
    const cap = await introspectPlugin(tmp, "opencode");
    expect(cap.byAssetType.skills.status).toBe("supported");
  });
});
