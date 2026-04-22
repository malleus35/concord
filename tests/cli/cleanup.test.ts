import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../../src/cli/index.js";

describe("concord cleanup CLI", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-cleanup-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("no-op when lock matches manifest", async () => {
    const manifest = join(tmp, "concord.yaml");
    const lock = join(tmp, "concord.lock");
    await writeFile(manifest, `concord_version: ">=0.1"\nskills: []\n`);
    await writeFile(lock, JSON.stringify({ lockfile_version: 1, roots: [], nodes: {} }));
    const code = await runCli(["cleanup", "--manifest", manifest, "--lock", lock, "--yes"]);
    expect(code).toBe(0);
  });

  it("removes extraneous target when --yes passed", async () => {
    const manifest = join(tmp, "concord.yaml");
    const lock = join(tmp, "concord.lock");
    const orphan = join(tmp, "orphan.txt");
    await writeFile(orphan, "content");
    await writeFile(manifest, `concord_version: ">=0.1"\nskills: []\n`);
    await writeFile(
      lock,
      JSON.stringify({
        lockfile_version: 1,
        roots: [],
        nodes: { "skills:gone": { target_path: orphan, source_digest: "x", target_digest: "y" } },
      }),
    );
    const code = await runCli(["cleanup", "--manifest", manifest, "--lock", lock, "--yes"]);
    expect(code).toBe(0);
    await expect(readFile(orphan, "utf8")).rejects.toThrow();
  });

  it("dry-run: reports but does not delete", async () => {
    const manifest = join(tmp, "concord.yaml");
    const lock = join(tmp, "concord.lock");
    const orphan = join(tmp, "orphan2.txt");
    await writeFile(orphan, "content");
    await writeFile(manifest, `concord_version: ">=0.1"\nskills: []\n`);
    await writeFile(
      lock,
      JSON.stringify({
        lockfile_version: 1,
        roots: [],
        nodes: { "skills:gone": { target_path: orphan, source_digest: "x", target_digest: "y" } },
      }),
    );
    const code = await runCli(["cleanup", "--manifest", manifest, "--lock", lock, "--dry-run"]);
    expect(code).toBe(0);
    expect((await readFile(orphan, "utf8")).length).toBeGreaterThan(0);
  });
});
