// file: tests/integration/e2e-bootstrap-workflow.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, mkdir, writeFile, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RunResult } from "../../src/utils/exec-file.js";

vi.mock("../../src/utils/exec-file.js", () => ({
  runCommand: vi.fn(async (cmd: string): Promise<RunResult> => {
    if (cmd === "claude") return { stdout: "claude version 2.0.1", stderr: "", status: 0 };
    return { stdout: "", stderr: "", status: 1 };
  }),
}));

import { runCli } from "../../src/cli/index.js";

describe("E2E: init → detect → adopt → doctor (§6.19 Solo scenario A)", () => {
  let tmp: string;
  let prevHome: string | undefined;
  let prevCwd: string;
  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "concord-e2e-"));
    prevHome = process.env.CONCORD_HOME;
    process.env.CONCORD_HOME = join(tmp, ".concord");
    prevCwd = process.cwd();
    process.chdir(tmp);
    process.env.CONCORD_NONINTERACTIVE = "1";
  });
  afterEach(async () => {
    process.chdir(prevCwd);
    if (prevHome === undefined) delete process.env.CONCORD_HOME;
    else process.env.CONCORD_HOME = prevHome;
    delete process.env.CONCORD_NONINTERACTIVE;
    await rm(tmp, { recursive: true, force: true });
  });

  it("init → detect → adopt → doctor all succeed", async () => {
    // Step 1: init
    expect(await runCli(["init", "--scope", "project"])).toBe(0);
    expect((await stat(join(tmp, "concord.yaml"))).isFile()).toBe(true);

    // Step 2: detect
    expect(await runCli(["detect"])).toBe(0);
    const cache = JSON.parse(await readFile(join(tmp, ".concord", ".detect-cache.json"), "utf8"));
    expect(cache.agents["claude-code"].installed).toBe(true);

    // Step 3: create a skill directory + adopt it
    await mkdir(join(tmp, ".claude", "skills", "hello"), { recursive: true });
    await writeFile(join(tmp, ".claude", "skills", "hello", "SKILL.md"), "---\nname: hello\n---\n");
    expect(await runCli(["adopt", "--scope", "project", "--yes"])).toBe(0);
    const manifest = await readFile(join(tmp, "concord.yaml"), "utf8");
    expect(manifest).toContain("claude-code:skills:hello");

    // Step 4: doctor still happy after adopt
    expect(await runCli(["doctor", "--manifest", join(tmp, "concord.yaml")])).toBe(0);
  });
});
