import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { replaceWhole } from "../../src/manifest-edit/replace-whole.js";

describe("replaceWhole", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-replace-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("creates a timestamped backup and writes the new content", async () => {
    const target = join(tmp, "concord.user.yaml");
    await writeFile(target, "old-content\n");
    const r = await replaceWhole(target, "new-content\n");
    expect(r.backupPath).toMatch(/concord\.user\.yaml\.bak\.\d{4}-\d{2}-\d{2}-\d{6}$/);
    expect(await readFile(target, "utf8")).toBe("new-content\n");
    expect(await readFile(r.backupPath, "utf8")).toBe("old-content\n");
    const entries = await readdir(tmp);
    expect(entries.filter((e) => /\.bak\./.test(e)).length).toBe(1);
  });

  it("fails if target missing", async () => {
    await expect(replaceWhole(join(tmp, "nonexistent.yaml"), "x")).rejects.toThrow();
  });
});
