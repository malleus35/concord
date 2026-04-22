import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { createAdoptedFetcher } from "../../src/fetch/adopted.js";

describe("AdoptedFetcher", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-af-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("supports type=adopted", () => {
    expect(createAdoptedFetcher().supports({ type: "adopted", path: "/x" })).toBe(true);
  });

  it("does NOT support type=file", () => {
    expect(createAdoptedFetcher().supports({ type: "file", path: "/x" })).toBe(false);
  });

  it("adopt existing file → localPath equals input, kind=file, digest matches", async () => {
    const filePath = join(tmp, "hello.txt");
    await writeFile(filePath, "hello world");
    const r = await createAdoptedFetcher().fetch(
      { type: "adopted", path: filePath },
      { concordHome: tmp, cacheDir: tmp },
    );
    expect(r.kind).toBe("file");
    expect(r.localPath).toBe(filePath); // zero-copy: same path
    expect(r.sourceDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
    // Verify digest is sha256 of file content
    const expectedDigest = "sha256:" + createHash("sha256").update("hello world").digest("hex");
    expect(r.sourceDigest).toBe(expectedDigest);
    expect(r.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("not found → not-found error", async () => {
    await expect(
      createAdoptedFetcher().fetch(
        { type: "adopted", path: join(tmp, "nonexistent.txt") },
        { concordHome: tmp, cacheDir: tmp },
      ),
    ).rejects.toMatchObject({ code: "not-found" });
  });

  it("adopt directory → localPath equals input, kind=directory, digest stable", async () => {
    const dirPath = join(tmp, "mydir");
    await mkdir(join(dirPath, "sub"), { recursive: true });
    await writeFile(join(dirPath, "a.txt"), "AAA");
    await writeFile(join(dirPath, "sub", "b.txt"), "BBB");

    const r1 = await createAdoptedFetcher().fetch(
      { type: "adopted", path: dirPath },
      { concordHome: tmp, cacheDir: tmp },
    );
    const r2 = await createAdoptedFetcher().fetch(
      { type: "adopted", path: dirPath },
      { concordHome: tmp, cacheDir: tmp },
    );

    expect(r1.kind).toBe("directory");
    expect(r1.localPath).toBe(dirPath); // zero-copy
    expect(r1.sourceDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(r1.sourceDigest).toBe(r2.sourceDigest); // stable
  });
});
