import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../../src/cli/index.js";

describe("concord doctor CLI", () => {
  let tmp: string;
  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "concord-doctor-"));
  });
  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it("runs with no manifest → exits non-zero with reason", async () => {
    const code = await runCli([
      "doctor",
      "--manifest",
      join(tmp, "nonexistent.yaml"),
    ]);
    expect(typeof code).toBe("number");
    expect(code).not.toBe(0);
  });

  it("runs with valid manifest → exits 0", async () => {
    const manifest = join(tmp, "concord.yaml");
    await writeFile(manifest, `concord_version: ">=0.1"\nskills: []\n`);
    const code = await runCli(["doctor", "--manifest", manifest]);
    expect(code).toBe(0);
  });

  it("--json flag exits 0 with valid manifest", async () => {
    const manifest = join(tmp, "concord.yaml");
    await writeFile(manifest, `concord_version: ">=0.1"\nskills: []\n`);
    const code = await runCli([
      "doctor",
      "--manifest",
      manifest,
      "--json",
    ]);
    expect(code).toBe(0);
  });
});
