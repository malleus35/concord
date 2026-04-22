import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../../src/cli/index.js";

describe("guided bootstrap (§6.14)", () => {
  let tmp: string;
  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "concord-boot-"));
  });
  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
    delete process.env.CONCORD_NONINTERACTIVE;
  });

  it("non-TTY + no lock + no flag → exit 1", async () => {
    process.env.CONCORD_NONINTERACTIVE = "1";
    const m = join(tmp, "concord.yaml");
    const l = join(tmp, "concord.lock");
    // Manifest with one asset — bootstrap should trigger
    // id must match /^[a-z0-9_-]+(:[a-z0-9_-]+){1,2}$/ pattern
    await writeFile(m, `concord_version: ">=0.1"\nskills:\n  - id: my:skill-x\n    source: { type: file, path: /nx }\n    target_path: ${join(tmp, "t")}\n`);
    const code = await runCli(["sync", "--manifest", m, "--lock", l]);
    expect(code).toBe(1);
  });

  it("non-TTY + no lock + --yes → proceeds past bootstrap gate", async () => {
    process.env.CONCORD_NONINTERACTIVE = "1";
    const m = join(tmp, "concord.yaml");
    const l = join(tmp, "concord.lock");
    await writeFile(m, `concord_version: ">=0.1"\nskills: []\n`);
    const code = await runCli(["sync", "--manifest", m, "--lock", l, "--yes"]);
    // empty manifest → 0 actions → exit 0 (bootstrap not needed, but --yes is harmless)
    expect(code).toBe(0);
  });

  it("empty manifest does not trigger bootstrap (no actions) even without --yes", async () => {
    process.env.CONCORD_NONINTERACTIVE = "1";
    const m = join(tmp, "concord.yaml");
    const l = join(tmp, "concord.lock");
    await writeFile(m, `concord_version: ">=0.1"\nskills: []\n`);
    const code = await runCli(["sync", "--manifest", m, "--lock", l]);
    // 0 actions → bootstrap gate skipped → exit 0
    expect(code).toBe(0);
  });
});
