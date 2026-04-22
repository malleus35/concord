import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readClaudePlugin } from "../../src/plugin/claude.js";

describe("readClaudePlugin", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-cp-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("valid plugin.json → parsed with name + components", async () => {
    const plugin = join(tmp, "my-plugin");
    await mkdir(plugin, { recursive: true });
    await writeFile(
      join(plugin, "plugin.json"),
      JSON.stringify({
        name: "my-plugin",
        version: "1.2.3",
        skills: ["skill-a", "skill-b"],
        mcp_servers: ["mcp-x"],
      }),
    );
    const p = await readClaudePlugin(plugin);
    expect(p).not.toBeNull();
    expect(p!.name).toBe("my-plugin");
    expect(p!.version).toBe("1.2.3");
    expect(p!.skills).toEqual(["skill-a", "skill-b"]);
    expect(p!.mcp_servers).toEqual(["mcp-x"]);
  });

  it("missing plugin.json → null", async () => {
    expect(await readClaudePlugin(tmp)).toBeNull();
  });

  it("malformed JSON → null (doctor will report separately)", async () => {
    await writeFile(join(tmp, "plugin.json"), "{ malformed");
    expect(await readClaudePlugin(tmp)).toBeNull();
  });
});
