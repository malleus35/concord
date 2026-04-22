import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createNpmFetcher } from "../../src/fetch/npm.js";

describe("NpmFetcher", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-nf-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("supports type=npm", () => {
    expect(createNpmFetcher().supports({ type: "npm", package: "x", version: "1.0.0" })).toBe(true);
  });

  it("cache hit", async () => {
    const cache = join(tmp, "cache", "npm", "x@1.0.0");
    await mkdir(cache, { recursive: true });
    await writeFile(join(cache, ".integrity"), "sha256:cached");
    const r = await createNpmFetcher().fetch(
      { type: "npm", package: "x", version: "1.0.0" },
      { concordHome: tmp, cacheDir: join(tmp, "cache"), allowNetwork: false },
    );
    expect(r.sourceDigest).toBe("sha256:cached");
  });

  it("cache miss + allowNetwork=false → network-disabled", async () => {
    await expect(
      createNpmFetcher().fetch(
        { type: "npm", package: "nonexistent-zzzz", version: "0.0.1" },
        { concordHome: tmp, cacheDir: join(tmp, "cache"), allowNetwork: false },
      ),
    ).rejects.toMatchObject({ code: "network-disabled" });
  });
});
