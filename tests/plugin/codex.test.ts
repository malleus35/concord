import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readCodexPlugin } from "../../src/plugin/codex.js";

describe("readCodexPlugin", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-codx-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("valid .codex-plugin/plugin.json → parsed", async () => {
    const dir = join(tmp, ".codex-plugin");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "plugin.json"), JSON.stringify({
      name: "cx", version: "0.1.0", hooks: ["h1"], mcp_servers: ["m1"],
    }));
    const p = await readCodexPlugin(tmp);
    expect(p).not.toBeNull();
    expect(p!.provider).toBe("codex");
    expect(p!.name).toBe("cx");
    expect(p!.version).toBe("0.1.0");
    expect(p!.hooks).toEqual(["h1"]);
    expect(p!.mcp_servers).toEqual(["m1"]);
  });

  it("missing plugin.json → null", async () => {
    expect(await readCodexPlugin(tmp)).toBeNull();
  });

  it("malformed JSON → null", async () => {
    const dir = join(tmp, ".codex-plugin");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "plugin.json"), "{ bad");
    expect(await readCodexPlugin(tmp)).toBeNull();
  });
});
