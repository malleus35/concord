import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../../src/cli/index.js";

describe("concord replace", () => {
  let tmp: string;
  let prevHome: string | undefined;
  let prevCwd: string;
  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "concord-replace-cli-"));
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

  it("--yes replaces and writes backup", async () => {
    const target = join(tmp, ".concord", "concord.user.yaml");
    await writeFile(target, `concord_version: ">=0.1"\nskills: []\n`);
    const external = join(tmp, "new.yaml");
    await writeFile(external, `concord_version: ">=0.1"\nsubagents: []\nskills: []\n`);
    const code = await runCli(["replace", external, "--target-scope", "user", "--yes"]);
    expect(code).toBe(0);
    const entries = await readdir(join(tmp, ".concord"));
    expect(entries.find((e) => /concord\.user\.yaml\.bak\./.test(e))).toBeDefined();
    expect(await readFile(target, "utf8")).toContain("subagents: []");
  });

  it("refuses invalid external manifest and leaves target untouched", async () => {
    const target = join(tmp, ".concord", "concord.user.yaml");
    await writeFile(target, `concord_version: ">=0.1"\nskills: []\n`);
    const external = join(tmp, "bad.yaml");
    await writeFile(external, `skills: not-a-list\n`);
    const code = await runCli(["replace", external, "--target-scope", "user", "--yes"]);
    expect(code).not.toBe(0);
    expect(await readFile(target, "utf8")).toContain("skills: []");
  });

  it("--url without --sha256 fails", async () => {
    const code = await runCli(["replace", "--url", "https://x.example/y.yaml", "--yes"]);
    expect(code).not.toBe(0);
  });

  it("--dry-run does not write or backup", async () => {
    const target = join(tmp, ".concord", "concord.user.yaml");
    await writeFile(target, `concord_version: ">=0.1"\nskills: []\n`);
    const external = join(tmp, "new.yaml");
    await writeFile(external, `concord_version: ">=0.1"\nsubagents: []\nskills: []\n`);
    const code = await runCli(["replace", external, "--target-scope", "user", "--dry-run"]);
    expect(code).toBe(0);
    // Target must still contain the old `skills: []` only
    expect(await readFile(target, "utf8")).toContain("skills: []");
    expect(await readFile(target, "utf8")).not.toContain("subagents: []");
    const entries = await readdir(join(tmp, ".concord"));
    expect(entries.find((e) => /\.bak\./.test(e))).toBeUndefined();
  });
});
