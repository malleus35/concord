import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFileFetcher } from "../../src/fetch/file.js";

describe("FileFetcher", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-ff-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("supports type=file", () => {
    expect(createFileFetcher().supports({ type: "file", path: "./x" })).toBe(true);
  });

  it("fetch file → copy + digest", async () => {
    const s = join(tmp, "s.md"); await writeFile(s, "X");
    const cache = join(tmp, "cache"); await mkdir(cache, { recursive: true });
    const r = await createFileFetcher().fetch({ type: "file", path: s }, { concordHome: tmp, cacheDir: cache });
    expect(r.kind).toBe("file");
    expect(r.sourceDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(await readFile(r.localPath, "utf8")).toBe("X");
  });

  it("fetch directory recursive", async () => {
    const s = join(tmp, "d"); await mkdir(join(s, "sub"), { recursive: true });
    await writeFile(join(s, "a"), "A"); await writeFile(join(s, "sub", "b"), "B");
    const cache = join(tmp, "cache"); await mkdir(cache, { recursive: true });
    const r = await createFileFetcher().fetch({ type: "file", path: s }, { concordHome: tmp, cacheDir: cache });
    expect(r.kind).toBe("directory");
    expect(await readFile(join(r.localPath, "a"), "utf8")).toBe("A");
    expect(await readFile(join(r.localPath, "sub", "b"), "utf8")).toBe("B");
  });

  it("not found → not-found error", async () => {
    await expect(
      createFileFetcher().fetch({ type: "file", path: join(tmp, "none") }, { concordHome: tmp, cacheDir: tmp }),
    ).rejects.toMatchObject({ code: "not-found" });
  });
});
