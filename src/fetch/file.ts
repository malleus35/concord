import { createHash } from "node:crypto";
import { readFile, stat, readdir } from "node:fs/promises";
import { copy } from "fs-extra";
import { join, basename } from "node:path";
import type { Fetcher, FetchResult } from "./types.js";
import { makeFetchError } from "./types.js";

export function createFileFetcher(): Fetcher {
  return {
    supports(source) { return source.type === "file"; },
    async fetch(source, ctx): Promise<FetchResult> {
      if (source.type !== "file") throw makeFetchError("unsupported-source", `FileFetcher: ${source.type}`);
      const src = (source as any).path as string;
      let st;
      try { st = await stat(src); } catch { throw makeFetchError("not-found", `file not found: ${src}`); }
      const kind = st.isDirectory() ? "directory" : "file";
      const digest = await computeDigest(src, kind);
      const cacheName = `${basename(src)}-${digest.slice(0, 12)}`;
      const cachePath = join(ctx.cacheDir, "file", cacheName);
      try {
        await copy(src, cachePath, { overwrite: true, errorOnExist: false });
      } catch (err) {
        throw makeFetchError("fetch-failed", `file copy: ${err instanceof Error ? err.message : String(err)}`);
      }
      return { localPath: cachePath, kind, sourceDigest: `sha256:${digest}`, fetchedAt: new Date().toISOString() };
    },
  };
}

async function computeDigest(path: string, kind: "file" | "directory"): Promise<string> {
  const h = createHash("sha256");
  if (kind === "file") { h.update(await readFile(path)); return h.digest("hex"); }
  async function walk(dir: string, rel: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const e of entries) {
      const full = join(dir, e.name); const r = join(rel, e.name);
      if (e.isDirectory()) await walk(full, r);
      else { h.update(r, "utf8"); h.update(await readFile(full)); }
    }
  }
  await walk(path, "");
  return h.digest("hex");
}
