import { createHash } from "node:crypto";
import { readFile, stat, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { Fetcher, FetchResult } from "./types.js";
import { makeFetchError } from "./types.js";

export function createAdoptedFetcher(): Fetcher {
  return {
    supports(source) { return source.type === "adopted"; },
    async fetch(source): Promise<FetchResult> {
      if (source.type !== "adopted") throw makeFetchError("unsupported-source", `AdoptedFetcher: ${source.type}`);
      const path = (source as any).path as string;
      let st;
      try { st = await stat(path); } catch { throw makeFetchError("not-found", `adopted: ${path}`); }
      const kind = st.isDirectory() ? "directory" : "file";
      const digest = await computeDigest(path, kind);
      return { localPath: path, kind, sourceDigest: `sha256:${digest}`, fetchedAt: new Date().toISOString() };
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
