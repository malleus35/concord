import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCommand } from "../../src/utils/exec-file.js";

const REPO = process.cwd();

describe("E2E: concord doctor", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-doctor-e-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("doctor --json produces valid JSON with expected keys", async () => {
    const manifest = join(tmp, "concord.yaml");
    await writeFile(manifest, `concord_version: ">=0.1"\nskills: []\n`);
    const res = await runCommand(
      "npx",
      ["tsx", join(REPO, "src/index.ts"), "doctor", "--manifest", manifest, "--json"],
      { cwd: tmp },
    );
    expect(res.status).toBe(0);
    const parsed = JSON.parse(res.stdout);
    expect(parsed.manifest).toBe(manifest);
    expect(parsed.platform).toBe(process.platform);
    expect(parsed.checks).toHaveProperty("gitBash");
    expect(parsed.checks).toHaveProperty("codexVersion");
    expect(parsed.checks).toHaveProperty("platformWarnings");
  }, 60000);
});
