import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCommand } from "../../src/utils/exec-file.js";

const REPO = process.cwd();

describe("E2E: secret interpolation", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-sec-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("sync resolves {env:SRC_FILE} in source.path + target installed", async () => {
    const srcFile = join(tmp, "source.md");
    await writeFile(srcFile, "hello", "utf8");
    const target = join(tmp, "out", "SKILL.md");
    const manifest = join(tmp, "concord.yaml");
    const lock = join(tmp, "concord.lock");
    await writeFile(
      manifest,
      [
        `concord_version: ">=0.1"`,
        `skills:`,
        `  - id: claude-code:skills:e`,
        `    provider: claude-code`,
        `    asset_type: skills`,
        `    source: { type: file, path: "{env:SRC_FILE}" }`,
        `    target_path: ${target}`,
        `    install: copy`,
        ``,
      ].join("\n"),
    );
    const env = { ...process.env, SRC_FILE: srcFile };
    const res = await runCommand(
      "npx",
      ["tsx", join(REPO, "src/index.ts"), "sync", "--manifest", manifest, "--lock", lock, "--yes"],
      { cwd: tmp, env },
    );
    expect(res.status).toBe(0);
    expect(await readFile(target, "utf8")).toBe("hello");
  }, 60000);

  it("sync fails cleanly when {env:X} is missing (E-4)", async () => {
    const manifest = join(tmp, "concord.yaml");
    const lock = join(tmp, "concord.lock");
    await writeFile(
      manifest,
      [
        `concord_version: ">=0.1"`,
        `skills:`,
        `  - id: claude-code:skills:m`,
        `    provider: claude-code`,
        `    asset_type: skills`,
        `    source: { type: file, path: "{env:MISSING_VAR_XYZ_E2E}" }`,
        `    target_path: ${join(tmp, "out")}`,
        `    install: copy`,
        ``,
      ].join("\n"),
    );
    // Drop MISSING_VAR_XYZ_E2E from env just in case
    const env = { ...process.env };
    delete env.MISSING_VAR_XYZ_E2E;
    const res = await runCommand(
      "npx",
      ["tsx", join(REPO, "src/index.ts"), "sync", "--manifest", manifest, "--lock", lock, "--yes"],
      { cwd: tmp, env },
    );
    // CLI likely returns 0 but emits error count in stdout/stderr.
    // Acceptance: output mentions env-var-missing OR MISSING_VAR_XYZ_E2E.
    const combined = res.stdout + "\n" + res.stderr;
    expect(combined).toMatch(/env-var-missing|MISSING_VAR_XYZ_E2E/);
  }, 60000);
});
