import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../../src/cli/index.js";

describe("concord init", () => {
  let tmp: string;
  let prevHome: string | undefined;
  let prevCwd: string;
  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "concord-init-"));
    prevHome = process.env.CONCORD_HOME;
    process.env.CONCORD_HOME = join(tmp, ".concord");
    prevCwd = process.cwd();
    process.chdir(tmp);
  });
  afterEach(async () => {
    process.chdir(prevCwd);
    if (prevHome === undefined) delete process.env.CONCORD_HOME;
    else process.env.CONCORD_HOME = prevHome;
    await rm(tmp, { recursive: true, force: true });
  });

  it("project scope → creates ./concord.yaml", async () => {
    const code = await runCli(["init", "--scope", "project"]);
    expect(code).toBe(0);
    const contents = await readFile(join(tmp, "concord.yaml"), "utf8");
    expect(contents).toContain('concord_version: ">=0.1"');
    expect(contents).toContain("skills: []");
    expect(contents).toContain("plugins: []");
  });

  it("user scope → creates <concordHome>/concord.user.yaml", async () => {
    const code = await runCli(["init", "--scope", "user"]);
    expect(code).toBe(0);
    const contents = await readFile(join(tmp, ".concord", "concord.user.yaml"), "utf8");
    expect(contents).toContain('concord_version: ">=0.1"');
  });

  it("fails when file already exists", async () => {
    await runCli(["init", "--scope", "project"]);
    const code = await runCli(["init", "--scope", "project"]);
    expect(code).not.toBe(0);
  });

  it("local scope → creates ./concord.local.yaml", async () => {
    const code = await runCli(["init", "--scope", "local"]);
    expect(code).toBe(0);
    const contents = await readFile(join(tmp, "concord.local.yaml"), "utf8");
    expect(contents).toContain("skills: []");
  });
});
