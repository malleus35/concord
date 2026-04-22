import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCommand } from "../../src/utils/exec-file.js";

const REPO = process.cwd();

describe("E2E: skill sync cycle", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-e2e-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("install → update → content 변경", async () => {
    const src = join(tmp, "src"); await mkdir(src, { recursive: true });
    await writeFile(join(src, "SKILL.md"), "# v1\n");
    const target = join(tmp, "out");
    const manifest = join(tmp, "concord.yaml");
    const lock = join(tmp, "concord.lock");
    await writeFile(manifest, `concord_version: ">=0.1"
skills:
  - id: claude-code:skills:ok
    provider: claude-code
    asset_type: skills
    source: { type: file, path: ${src} }
    target_path: ${target}
    install: copy
`);
    await runCommand("npx", ["tsx", join(REPO, "src/index.ts"), "sync", "--manifest", manifest, "--lock", lock], { cwd: tmp });
    expect(await readFile(join(target, "SKILL.md"), "utf8")).toBe("# v1\n");
    await writeFile(join(src, "SKILL.md"), "# v2\n");
    await runCommand("npx", ["tsx", join(REPO, "src/index.ts"), "sync", "--manifest", manifest, "--lock", lock], { cwd: tmp });
    expect(await readFile(join(target, "SKILL.md"), "utf8")).toBe("# v2\n");
  }, 60000);
});
