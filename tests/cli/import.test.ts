import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, readFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../../src/cli/index.js";

describe("concord import", () => {
  let tmp: string;
  let prevHome: string | undefined;
  let prevCwd: string;
  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "concord-import-"));
    prevHome = process.env.CONCORD_HOME;
    process.env.CONCORD_HOME = join(tmp, ".concord");
    await mkdir(process.env.CONCORD_HOME, { recursive: true });
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

  it("imports entries from a local file with --yes", async () => {
    const target = join(tmp, ".concord", "concord.user.yaml");
    await writeFile(target, `concord_version: ">=0.1"\nskills: []\n`);
    const external = join(tmp, "friend.yaml");
    await writeFile(external, `skills:\n  - id: friend-skill\n    source: { type: file, path: /x }\n`);
    const code = await runCli(["import", external, "--target-scope", "user", "--yes"]);
    expect(code).toBe(0);
    const contents = await readFile(target, "utf8");
    expect(contents).toContain("friend-skill");
  });

  it("dry-run prints conflicts without writing", async () => {
    const target = join(tmp, ".concord", "concord.user.yaml");
    await writeFile(target, `skills:\n  - id: foo\n    source: { type: file, path: /mine }\n`);
    const external = join(tmp, "ext.yaml");
    await writeFile(external, `skills:\n  - id: foo\n    source: { type: file, path: /theirs }\n`);
    const code = await runCli(["import", external, "--target-scope", "user", "--dry-run", "--policy", "replace"]);
    expect(code).toBe(0);
    const contents = await readFile(target, "utf8");
    expect(contents).toContain("/mine");
    expect(contents).not.toContain("/theirs");
  });

  it("fails without file or --url", async () => {
    const code = await runCli(["import", "--target-scope", "user", "--yes"]);
    expect(code).toBe(1);
  });

  it("--url without --sha256 fails", async () => {
    const code = await runCli(["import", "--url", "https://example.com/x.yaml", "--yes"]);
    expect(code).toBe(1);
  });

  it("target manifest missing → exit 1", async () => {
    const external = join(tmp, "ext.yaml");
    await writeFile(external, `skills: []\n`);
    const code = await runCli(["import", external, "--target-scope", "user", "--yes"]);
    expect(code).toBe(1);
  });
});
