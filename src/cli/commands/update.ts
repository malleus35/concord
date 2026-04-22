import { Command } from "commander";
import { resolve, join } from "node:path";
import { loadYaml } from "../../io/yaml-loader.js";
import { readLock } from "../../io/lock-io.js";
import { writeLockAtomic } from "../../io/lock-write.js";
import { validateManifest } from "../../schema/validate-manifest.js";
import { computeSyncPlan } from "../../sync/plan.js";
import { runSync } from "../../sync/runner.js";
import { findConcordHome } from "../../discovery/concord-home.js";

const ASSET_KEYS = ["skills", "subagents", "hooks", "mcp_servers", "instructions", "plugins"] as const;

/** §6.8 concord update — re-run sync (optionally filtered by <id>) and refresh lock. */
export function registerUpdateCommand(program: Command, setExitCode: (c: number) => void): void {
  program
    .command("update [id]")
    .description("Re-fetch source(s); update lock if source digests changed")
    .option("--manifest <path>", "", "concord.yaml")
    .option("--lock <path>", "", "concord.lock")
    .option("--json")
    .action(async (idArg: string | undefined, opts: { manifest: string; lock: string; json?: boolean }) => {
      const manifestPath = resolve(opts.manifest);
      const lockPath = resolve(opts.lock);
      const concordHome = findConcordHome();
      const cacheDir = join(concordHome, "cache");

      let manifestRaw: unknown;
      try {
        manifestRaw = loadYaml(manifestPath);
        validateManifest(manifestRaw);
      } catch (err) {
        process.stderr.write(`error: ${(err as Error).message}\n`);
        setExitCode(1); return;
      }

      // Filter by id (walk asset lists, keep only entries whose id matches idArg)
      if (idArg) {
        const filtered = { ...(manifestRaw as Record<string, unknown>) };
        for (const at of ASSET_KEYS) {
          const arr = filtered[at];
          if (Array.isArray(arr)) {
            filtered[at] = arr.filter((e) => e && typeof e === "object" && (e as Record<string, unknown>).id === idArg);
          }
        }
        manifestRaw = filtered;
      }

      const currentLock = await Promise.resolve()
        .then(() => readLock(lockPath))
        .catch(() => ({ lockfile_version: 1, roots: [], nodes: {} } as any));
      const plan = computeSyncPlan(manifestRaw as any, currentLock);
      const result = await runSync(plan, { fetchContext: { concordHome, cacheDir, allowNetwork: true } });

      if (opts.json) {
        process.stdout.write(JSON.stringify({ plan: plan.summary, result }, null, 2) + "\n");
      } else {
        process.stdout.write(
          `update: install=${result.installed.length} update=${result.updated.length} skip=${result.skipped.length} errors=${result.errors.length}\n`,
        );
      }

      if (result.errors.length > 0) {
        for (const e of result.errors) process.stderr.write(`ERROR ${e.nodeId}: ${e.message}\n`);
        setExitCode(1);
        return;
      }
      await writeLockAtomic(lockPath, currentLock);
    });
}
