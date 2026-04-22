import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readOpenCodePlugin } from "../../src/plugin/opencode.js";

describe("readOpenCodePlugin", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-ocp-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("valid package.json with main + opencode.skills → parsed", async () => {
    await writeFile(join(tmp, "package.json"), JSON.stringify({
      name: "oc-demo", version: "1.0.0", main: "index.js",
      opencode: { skills: ["s1"], hooks: ["h1"] },
    }));
    const p = await readOpenCodePlugin(tmp);
    expect(p).not.toBeNull();
    expect(p!.provider).toBe("opencode");
    expect(p!.name).toBe("oc-demo");
    expect(p!.skills).toEqual(["s1"]);
    expect(p!.hooks).toEqual(["h1"]);
  });

  it("package.json missing main → null (not a valid plugin)", async () => {
    await writeFile(join(tmp, "package.json"), JSON.stringify({ name: "x", version: "1.0.0" }));
    expect(await readOpenCodePlugin(tmp)).toBeNull();
  });

  it("missing package.json → null", async () => {
    expect(await readOpenCodePlugin(tmp)).toBeNull();
  });

  it("malformed JSON → null", async () => {
    await writeFile(join(tmp, "package.json"), "{ malformed");
    expect(await readOpenCodePlugin(tmp)).toBeNull();
  });
});
