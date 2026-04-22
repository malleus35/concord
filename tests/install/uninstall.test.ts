import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir, symlink, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { uninstall } from "../../src/install/uninstall.js";

describe("uninstall", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-uninstall-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("removes a symlink without touching source", async () => {
    const src = join(tmp, "src"); await mkdir(src); await writeFile(join(src, "x"), "hi");
    const tgt = join(tmp, "tgt");
    await symlink(src, tgt);
    const r = await uninstall(tgt);
    expect(r.removed).toBe(true);
    // source survives
    expect(await readFile(join(src, "x"), "utf8")).toBe("hi");
  });

  it("removes a directory (copy install) recursively", async () => {
    const tgt = join(tmp, "cp"); await mkdir(tgt); await writeFile(join(tgt, "y"), "Y");
    const r = await uninstall(tgt);
    expect(r.removed).toBe(true);
    await expect(stat(tgt)).rejects.toThrow();
  });

  it("already missing target → removed=false, no error", async () => {
    const r = await uninstall(join(tmp, "never-existed"));
    expect(r.removed).toBe(false);
  });
});
