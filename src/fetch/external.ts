import { createHash } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { runCommand } from "../utils/exec-file.js";
import type { Fetcher, FetchResult } from "./types.js";
import { makeFetchError } from "./types.js";

export function createExternalFetcher(): Fetcher {
  return {
    supports(source) { return source.type === "external"; },
    async fetch(source, ctx): Promise<FetchResult> {
      if (source.type !== "external") throw makeFetchError("unsupported-source", `ExternalFetcher: ${source.type}`);
      const { command, args } = source as any;
      const res = await runCommand(command, args);
      if (res.errorCode === "ENOENT") throw makeFetchError("provider-cli-missing", `CLI missing: ${command}`);
      if (res.status !== 0) throw makeFetchError("fetch-failed", `CLI exit ${res.status}: ${res.stderr}`);
      const hex = createHash("sha256").update(res.stdout, "utf8").digest("hex");
      const cachePath = join(ctx.cacheDir, "external", hex.slice(0, 16));
      await mkdir(join(ctx.cacheDir, "external"), { recursive: true });
      await writeFile(cachePath, res.stdout);
      return { localPath: cachePath, kind: "file", sourceDigest: `sha256:${hex}`, fetchedAt: new Date().toISOString() };
    },
  };
}
