import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../../src/cli/index.js";

describe("concord adopt", () => {
  let tmp: string;
  let prevHome: string | undefined;
  let prevCwd: string;
  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "concord-adopt-cli-"));
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

  it("--dry-run prints candidates without writing", async () => {
    await mkdir(join(tmp, ".claude", "skills", "code-reviewer"), { recursive: true });
    await writeFile(join(tmp, ".claude", "skills", "code-reviewer", "SKILL.md"), "---\nname: code-reviewer\n---\n");
    await writeFile(join(tmp, "concord.yaml"), `concord_version: ">=0.1"\nskills: []\n`);
    const code = await runCli(["adopt", "--scope", "project", "--dry-run"]);
    expect(code).toBe(0);
    const contents = await readFile(join(tmp, "concord.yaml"), "utf8");
    expect(contents).not.toContain("code-reviewer");
  });

  it("--yes applies changes to the project manifest", async () => {
    await mkdir(join(tmp, ".claude", "skills", "code-reviewer"), { recursive: true });
    await writeFile(join(tmp, ".claude", "skills", "code-reviewer", "SKILL.md"), "---\nname: code-reviewer\n---\n");
    await writeFile(join(tmp, "concord.yaml"), `concord_version: ">=0.1"\nskills: []\n`);
    const code = await runCli(["adopt", "--scope", "project", "--yes"]);
    expect(code).toBe(0);
    const contents = await readFile(join(tmp, "concord.yaml"), "utf8");
    expect(contents).toContain("code-reviewer");
  });

  it("non-TTY without flag fails conservatively", async () => {
    await mkdir(join(tmp, ".claude", "skills", "x"), { recursive: true });
    await writeFile(join(tmp, ".claude", "skills", "x", "SKILL.md"), "---\nname: x\n---\n");
    await writeFile(join(tmp, "concord.yaml"), `concord_version: ">=0.1"\nskills: []\n`);
    const code = await runCli(["adopt", "--scope", "project"]);
    expect(code).toBe(1);
  });

  it("project scope requires concord.yaml", async () => {
    const code = await runCli(["adopt", "--scope", "project", "--yes"]);
    expect(code).not.toBe(0);
  });
});
