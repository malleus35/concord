import { mkdir, stat, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { runCommand } from "../utils/exec-file.js";
import type { Fetcher, FetchResult } from "./types.js";
import { makeFetchError } from "./types.js";

export function createNpmFetcher(): Fetcher {
  return {
    supports(source) { return source.type === "npm"; },
    async fetch(source, ctx): Promise<FetchResult> {
      if (source.type !== "npm") throw makeFetchError("unsupported-source", `NpmFetcher: ${source.type}`);
      const { package: pkg, version } = source as any;
      const cachePath = join(ctx.cacheDir, "npm", `${pkg.replace(/\//g, "_")}@${version}`);
      const cached = await stat(cachePath).catch(() => null);
      if (cached?.isDirectory()) {
        const integrity = await readFile(join(cachePath, ".integrity"), "utf8").catch(() => null);
        if (integrity) {
          return { localPath: cachePath, kind: "directory", sourceDigest: integrity.trim(), fetchedAt: new Date().toISOString() };
        }
      }
      if (ctx.allowNetwork === false) throw makeFetchError("network-disabled", `npm pack denied: ${pkg}@${version}`);
      await mkdir(cachePath, { recursive: true });
      const packRes = await runCommand("npm", ["pack", `${pkg}@${version}`, "--json"], { cwd: cachePath });
      if (packRes.status !== 0) throw makeFetchError("fetch-failed", `npm pack: ${packRes.stderr}`);
      const parsed = JSON.parse(packRes.stdout);
      const first = Array.isArray(parsed) ? parsed[0] : parsed;
      const integrity = first?.integrity ?? first?.shasum;
      if (!integrity) throw makeFetchError("fetch-failed", "npm pack: no integrity");
      const tarRes = await runCommand("tar", ["-xzf", first.filename, "--strip-components=1", "-C", cachePath], { cwd: cachePath });
      if (tarRes.status !== 0) throw makeFetchError("fetch-failed", `tar extract: ${tarRes.stderr}`);
      const digest = integrity.startsWith("sha256") ? integrity : `sha256:${integrity}`;
      await writeFile(join(cachePath, ".integrity"), digest);
      return { localPath: cachePath, kind: "directory", sourceDigest: digest, fetchedAt: new Date().toISOString() };
    },
  };
}
