import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCommand } from "../../src/utils/exec-file.js";

const REPO = process.cwd();

describe("E2E: concord cleanup", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-clean-e-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("removes extraneous lock entry with --yes", async () => {
    const manifest = join(tmp, "concord.yaml");
    const lock = join(tmp, "concord.lock");
    const orphan = join(tmp, "orphan.txt");
    await writeFile(orphan, "bye");
    await writeFile(manifest, `concord_version: ">=0.1"\nskills: []\n`);
    await writeFile(
      lock,
      JSON.stringify({
        lockfile_version: 1,
        roots: [],
        nodes: { "skills:gone": { target_path: orphan, source_digest: "x", target_digest: "y" } },
      }),
    );
    const res = await runCommand(
      "npx",
      ["tsx", join(REPO, "src/index.ts"), "cleanup", "--manifest", manifest, "--lock", lock, "--yes"],
      { cwd: tmp },
    );
    expect(res.status).toBe(0);
    await expect(readFile(orphan, "utf8")).rejects.toThrow();
    const updated = JSON.parse(await readFile(lock, "utf8"));
    expect(updated.nodes["skills:gone"]).toBeUndefined();
  }, 60000);

  it("dry-run preserves orphan", async () => {
    const manifest = join(tmp, "concord.yaml");
    const lock = join(tmp, "concord.lock");
    const orphan = join(tmp, "orphan.txt");
    await writeFile(orphan, "bye");
    await writeFile(manifest, `concord_version: ">=0.1"\nskills: []\n`);
    await writeFile(
      lock,
      JSON.stringify({
        lockfile_version: 1,
        roots: [],
        nodes: { "skills:gone": { target_path: orphan, source_digest: "x", target_digest: "y" } },
      }),
    );
    const res = await runCommand(
      "npx",
      ["tsx", join(REPO, "src/index.ts"), "cleanup", "--manifest", manifest, "--lock", lock, "--dry-run"],
      { cwd: tmp },
    );
    expect(res.status).toBe(0);
    expect(await readFile(orphan, "utf8")).toBe("bye");
  }, 60000);
});
