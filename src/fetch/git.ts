import { stat, mkdir, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { runCommand } from "../utils/exec-file.js";
import type { Fetcher, FetchResult } from "./types.js";
import { makeFetchError } from "./types.js";

export function createGitFetcher(): Fetcher {
  return {
    supports(source) { return source.type === "git"; },
    async fetch(source, ctx): Promise<FetchResult> {
      if (source.type !== "git") throw makeFetchError("unsupported-source", `GitFetcher: ${source.type}`);
      const { url, ref } = source as any;
      const cacheKey = createHash("sha256").update(`${url}@${ref}`, "utf8").digest("hex").slice(0, 16);
      const cachePath = join(ctx.cacheDir, "git", cacheKey);
      const cached = await stat(cachePath).catch(() => null);
      if (cached?.isDirectory()) {
        const r = await runCommand("git", ["-C", cachePath, "rev-parse", "HEAD"]);
        if (r.status !== 0) throw makeFetchError("fetch-failed", `rev-parse failed: ${r.stderr}`);
        return { localPath: cachePath, kind: "directory", sourceDigest: `sha256:${r.stdout.trim()}`, fetchedAt: new Date().toISOString() };
      }
      if (ctx.allowNetwork === false) throw makeFetchError("network-disabled", `git clone denied: ${url}`);
      await mkdir(join(ctx.cacheDir, "git"), { recursive: true });
      const clone = await runCommand("git", ["clone", url, cachePath]);
      if (clone.status !== 0) {
        await rm(cachePath, { recursive: true, force: true });
        throw makeFetchError("fetch-failed", `git clone: ${clone.stderr}`);
      }
      const co = await runCommand("git", ["-C", cachePath, "checkout", ref]);
      if (co.status !== 0) {
        await rm(cachePath, { recursive: true, force: true });
        throw makeFetchError("fetch-failed", `git checkout ${ref}: ${co.stderr}`);
      }
      const rev = await runCommand("git", ["-C", cachePath, "rev-parse", "HEAD"]);
      return { localPath: cachePath, kind: "directory", sourceDigest: `sha256:${rev.stdout.trim()}`, fetchedAt: new Date().toISOString() };
    },
  };
}
