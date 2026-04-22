import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCommand } from "../../src/utils/exec-file.js";
import { createGitFetcher } from "../../src/fetch/git.js";

describe("GitFetcher", () => {
  let tmp: string, bare: string, sha: string;
  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "concord-gf-"));
    const work = join(tmp, "work"); bare = join(tmp, "bare.git");
    await mkdir(work, { recursive: true });
    await runCommand("git", ["init", "-b", "main"], { cwd: work });
    await runCommand("git", ["config", "user.email", "t@x"], { cwd: work });
    await runCommand("git", ["config", "user.name", "t"], { cwd: work });
    await writeFile(join(work, "R.md"), "# R");
    await runCommand("git", ["add", "."], { cwd: work });
    await runCommand("git", ["commit", "-m", "i"], { cwd: work });
    await runCommand("git", ["clone", "--bare", work, bare]);
    sha = (await runCommand("git", ["-C", work, "rev-parse", "HEAD"])).stdout.trim();
  });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("supports type=git", () => {
    expect(createGitFetcher().supports({ type: "git", url: "x", ref: "main" })).toBe(true);
  });

  it("fetch: clone + ref + digest=SHA", async () => {
    const cache = join(tmp, "cache"); await mkdir(cache, { recursive: true });
    const r = await createGitFetcher().fetch(
      { type: "git", url: bare, ref: "main" },
      { concordHome: tmp, cacheDir: cache, allowNetwork: true },
    );
    expect(r.sourceDigest).toBe(`sha256:${sha}`);
    expect(await readFile(join(r.localPath, "R.md"), "utf8")).toBe("# R");
  });

  it("cache miss + allowNetwork=false → network-disabled", async () => {
    const cache = join(tmp, "cache"); await mkdir(cache, { recursive: true });
    await expect(
      createGitFetcher().fetch(
        { type: "git", url: bare, ref: "main" },
        { concordHome: tmp, cacheDir: cache, allowNetwork: false },
      ),
    ).rejects.toMatchObject({ code: "network-disabled" });
  });
});
