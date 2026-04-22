import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer, type Server } from "node:http";
import { createHash } from "node:crypto";
import { createHttpFetcher } from "../../src/fetch/http.js";

describe("HttpFetcher", () => {
  let tmp: string, server: Server, url: string;
  const body = "hi";
  const sha = `sha256:${createHash("sha256").update(body).digest("hex")}`;
  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "concord-hf-"));
    server = createServer((_, res) => { res.writeHead(200); res.end(body); });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const addr = server.address() as { port: number };
    url = `http://127.0.0.1:${addr.port}/x`;
  });
  afterEach(async () => {
    await new Promise<void>((r) => server.close(() => r()));
    await rm(tmp, { recursive: true, force: true });
  });

  it("digest match", async () => {
    const r = await createHttpFetcher().fetch(
      { type: "http", url, sha256: sha },
      { concordHome: tmp, cacheDir: tmp, allowNetwork: true },
    );
    expect(r.sourceDigest).toBe(sha);
    expect(await readFile(r.localPath, "utf8")).toBe(body);
  });

  it("digest mismatch → error", async () => {
    await expect(
      createHttpFetcher().fetch(
        { type: "http", url, sha256: "sha256:ffff" },
        { concordHome: tmp, cacheDir: tmp, allowNetwork: true },
      ),
    ).rejects.toMatchObject({ code: "digest-mismatch" });
  });

  it("allowNetwork=false + cache miss → network-disabled", async () => {
    await expect(
      createHttpFetcher().fetch(
        { type: "http", url, sha256: sha },
        { concordHome: tmp, cacheDir: tmp, allowNetwork: false },
      ),
    ).rejects.toMatchObject({ code: "network-disabled" });
  });
});
