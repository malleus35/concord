import { createHash } from "node:crypto";
import { writeFile, mkdir, stat, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Fetcher, FetchResult } from "./types.js";
import { makeFetchError } from "./types.js";

export function createHttpFetcher(): Fetcher {
  return {
    supports(source) { return source.type === "http"; },
    async fetch(source, ctx): Promise<FetchResult> {
      if (source.type !== "http") throw makeFetchError("unsupported-source", `HttpFetcher: ${source.type}`);
      const { url, sha256: expected } = source as any;
      const cacheKey = createHash("sha256").update(url, "utf8").digest("hex").slice(0, 16);
      const cachePath = join(ctx.cacheDir, "http", cacheKey);
      const cached = await stat(cachePath).catch(() => null);
      if (cached?.isFile()) {
        const data = await readFile(cachePath);
        const actual = `sha256:${createHash("sha256").update(data).digest("hex")}`;
        if (actual === expected) {
          return { localPath: cachePath, kind: "file", sourceDigest: actual, fetchedAt: new Date().toISOString() };
        }
      }
      if (ctx.allowNetwork === false) throw makeFetchError("network-disabled", `http fetch denied: ${url}`);
      let data: Buffer;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = Buffer.from(await res.arrayBuffer());
      } catch (err) {
        throw makeFetchError("fetch-failed", `http: ${err instanceof Error ? err.message : String(err)}`);
      }
      const actual = `sha256:${createHash("sha256").update(data).digest("hex")}`;
      if (actual !== expected) throw makeFetchError("digest-mismatch", `expected ${expected}, got ${actual}`);
      await mkdir(join(ctx.cacheDir, "http"), { recursive: true });
      await writeFile(cachePath, data);
      return { localPath: cachePath, kind: "file", sourceDigest: actual, fetchedAt: new Date().toISOString() };
    },
  };
}
